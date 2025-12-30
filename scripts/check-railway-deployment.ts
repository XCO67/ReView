#!/usr/bin/env tsx
/**
 * Railway Deployment Checker
 * 
 * This script checks the Railway deployment status and shows recent deployments and errors.
 * 
 * Usage:
 *   npx tsx scripts/check-railway-deployment.ts
 * 
 * Environment Variables:
 *   RAILWAY_TOKEN - Your Railway API token (optional, will prompt if not set)
 *   RAILWAY_PROJECT_ID - Your Railway project ID (optional, will try to detect)
 *   RAILWAY_SERVICE_ID - Your Railway service ID (optional, will try to detect)
 */

import https from 'https';
import { readFileSync } from 'fs';
import { join } from 'path';

interface RailwayDeployment {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  meta?: {
    buildCommand?: string;
    startCommand?: string;
  };
}

interface RailwayService {
  id: string;
  name: string;
  projectId: string;
}

interface RailwayProject {
  id: string;
  name: string;
}

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url: string, token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };

    https.get(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function getProjects(token: string): Promise<RailwayProject[]> {
  try {
    const response = await makeRequest('https://api.railway.app/v1/projects', token);
    return response.projects || [];
  } catch (error) {
    log(`Error fetching projects: ${error}`, 'red');
    return [];
  }
}

async function getServices(token: string, projectId: string): Promise<RailwayService[]> {
  try {
    const response = await makeRequest(
      `https://api.railway.app/v1/projects/${projectId}/services`,
      token
    );
    return response.services || [];
  } catch (error) {
    log(`Error fetching services: ${error}`, 'red');
    return [];
  }
}

async function getDeployments(
  token: string,
  serviceId: string,
  limit: number = 10
): Promise<RailwayDeployment[]> {
  try {
    const response = await makeRequest(
      `https://api.railway.app/v1/services/${serviceId}/deployments?limit=${limit}`,
      token
    );
    return response.deployments || [];
  } catch (error) {
    log(`Error fetching deployments: ${error}`, 'red');
    return [];
  }
}

async function getDeploymentLogs(token: string, deploymentId: string): Promise<string> {
  try {
    const response = await makeRequest(
      `https://api.railway.app/v1/deployments/${deploymentId}/logs`,
      token
    );
    return response.logs || 'No logs available';
  } catch (error) {
    return `Error fetching logs: ${error}`;
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString();
}

function getStatusColor(status: string): keyof typeof colors {
  switch (status.toLowerCase()) {
    case 'success':
    case 'deployed':
      return 'green';
    case 'building':
    case 'queued':
      return 'yellow';
    case 'failed':
    case 'error':
      return 'red';
    default:
      return 'reset';
  }
}

async function checkDeployment() {
  log('\n🚂 Railway Deployment Checker\n', 'cyan');

  // Get Railway token
  const token = process.env.RAILWAY_TOKEN;
  if (!token) {
    log('⚠️  RAILWAY_TOKEN environment variable is not set.', 'yellow');
    log('   You can get your token from: https://railway.app/account/tokens', 'yellow');
    log('   Or set it as: export RAILWAY_TOKEN=your_token_here\n', 'yellow');
    process.exit(1);
  }

  // Get project ID
  let projectId = process.env.RAILWAY_PROJECT_ID;
  if (!projectId) {
    log('📋 Fetching projects...', 'blue');
    const projects = await getProjects(token);
    if (projects.length === 0) {
      log('❌ No projects found.', 'red');
      process.exit(1);
    }
    
    if (projects.length === 1) {
      projectId = projects[0].id;
      log(`✓ Using project: ${projects[0].name} (${projectId})`, 'green');
    } else {
      log('\nAvailable projects:', 'cyan');
      projects.forEach((project, index) => {
        log(`  ${index + 1}. ${project.name} (${project.id})`, 'reset');
      });
      log('\n💡 Set RAILWAY_PROJECT_ID to skip this step.\n', 'yellow');
      // For now, use the first project
      projectId = projects[0].id;
      log(`✓ Using first project: ${projects[0].name}`, 'green');
    }
  }

  // Get service ID
  let serviceId = process.env.RAILWAY_SERVICE_ID;
  if (!serviceId) {
    log('\n📦 Fetching services...', 'blue');
    const services = await getServices(token, projectId);
    if (services.length === 0) {
      log('❌ No services found.', 'red');
      process.exit(1);
    }
    
    if (services.length === 1) {
      serviceId = services[0].id;
      log(`✓ Using service: ${services[0].name} (${serviceId})`, 'green');
    } else {
      log('\nAvailable services:', 'cyan');
      services.forEach((service, index) => {
        log(`  ${index + 1}. ${service.name} (${service.id})`, 'reset');
      });
      log('\n💡 Set RAILWAY_SERVICE_ID to skip this step.\n', 'yellow');
      // For now, use the first service
      serviceId = services[0].id;
      log(`✓ Using first service: ${services[0].name}`, 'green');
    }
  }

  // Get deployments
  log('\n📊 Fetching recent deployments...', 'blue');
  const deployments = await getDeployments(token, serviceId, 5);

  if (deployments.length === 0) {
    log('❌ No deployments found.', 'red');
    process.exit(1);
  }

  log(`\n${'='.repeat(80)}`, 'cyan');
  log('Recent Deployments:', 'bright');
  log('='.repeat(80), 'cyan');

  for (const deployment of deployments) {
    const statusColor = getStatusColor(deployment.status);
    log(`\n📦 Deployment: ${deployment.id}`, 'cyan');
    log(`   Status: ${deployment.status}`, statusColor);
    log(`   Created: ${formatDate(deployment.createdAt)}`, 'reset');
    log(`   Updated: ${formatDate(deployment.updatedAt)}`, 'reset');
    
    if (deployment.status.toLowerCase() === 'failed' || deployment.status.toLowerCase() === 'error') {
      log(`\n   🔍 Fetching logs for failed deployment...`, 'yellow');
      const logs = await getDeploymentLogs(token, deployment.id);
      log(`\n   ${'─'.repeat(76)}`, 'yellow');
      log('   Build Logs:', 'yellow');
      log('   ' + '─'.repeat(76), 'yellow');
      // Show last 50 lines of logs
      const logLines = logs.split('\n');
      const recentLogs = logLines.slice(-50).join('\n');
      console.log('   ' + recentLogs.split('\n').join('\n   '));
      log(`   ${'─'.repeat(76)}\n`, 'yellow');
    }
  }

  const latestDeployment = deployments[0];
  const latestStatus = latestDeployment.status.toLowerCase();

  log('\n' + '='.repeat(80), 'cyan');
  if (latestStatus === 'success' || latestStatus === 'deployed') {
    log('✅ Latest deployment is successful!', 'green');
  } else if (latestStatus === 'building' || latestStatus === 'queued') {
    log('⏳ Latest deployment is still in progress...', 'yellow');
  } else {
    log('❌ Latest deployment has failed!', 'red');
    log('\n💡 Check the logs above for error details.', 'yellow');
  }
  log('='.repeat(80) + '\n', 'cyan');
}

// Run the checker
checkDeployment().catch((error) => {
  log(`\n❌ Error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});


