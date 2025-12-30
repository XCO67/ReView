#!/usr/bin/env tsx
/**
 * Simple Deployment Checker
 * 
 * Checks if the deployed Railway site is accessible and shows basic info.
 * 
 * Usage:
 *   npx tsx scripts/check-deployment-simple.ts [url]
 * 
 * Environment Variables:
 *   DEPLOYMENT_URL - The URL of your deployed Railway app (defaults to checking common Railway URLs)
 */

import https from 'https';
import http from 'http';

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

function checkUrl(url: string): Promise<{ status: number; accessible: boolean; error?: string }> {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    const startTime = Date.now();

    const req = protocol.get(url, { timeout: 10000 }, (res) => {
      const duration = Date.now() - startTime;
      let data = '';

      res.on('data', (chunk) => {
        data += chunk.toString();
      });

      res.on('end', () => {
        resolve({
          status: res.statusCode || 0,
          accessible: res.statusCode ? res.statusCode >= 200 && res.statusCode < 400 : false,
        });
      });
    });

    req.on('error', (err: Error) => {
      resolve({
        status: 0,
        accessible: false,
        error: err.message,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        status: 0,
        accessible: false,
        error: 'Request timeout',
      });
    });
  });
}

async function checkDeployment() {
  log('\n🌐 Simple Deployment Checker\n', 'cyan');

  const url = process.argv[2] || process.env.DEPLOYMENT_URL;
  
  if (!url) {
    log('⚠️  No URL provided.', 'yellow');
    log('   Usage: npx tsx scripts/check-deployment-simple.ts <url>', 'yellow');
    log('   Or set DEPLOYMENT_URL environment variable.\n', 'yellow');
    log('   Example URLs:', 'cyan');
    log('     - https://your-app.railway.app', 'reset');
    log('     - https://your-app.up.railway.app\n', 'reset');
    process.exit(1);
  }

  // Normalize URL
  let normalizedUrl = url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    normalizedUrl = `https://${url}`;
  }

  log(`Checking: ${normalizedUrl}\n`, 'blue');

  const result = await checkUrl(normalizedUrl);

  log('='.repeat(80), 'cyan');
  if (result.accessible) {
    log('✅ Deployment is accessible!', 'green');
    log(`   Status Code: ${result.status}`, 'green');
  } else {
    log('❌ Deployment is not accessible', 'red');
    if (result.status > 0) {
      log(`   Status Code: ${result.status}`, 'red');
    }
    if (result.error) {
      log(`   Error: ${result.error}`, 'red');
    }
  }
  log('='.repeat(80) + '\n', 'cyan');

  // Also check GitHub Actions if we're in a git repo
  try {
    const { execSync } = require('child_process');
    try {
      const gitRemote = execSync('git remote get-url origin', { encoding: 'utf-8' }).trim();
      if (gitRemote.includes('github.com')) {
        const repoMatch = gitRemote.match(/github\.com[:/](.+?)(?:\.git)?$/);
        if (repoMatch) {
          const repo = repoMatch[1];
          log('💡 To check GitHub Actions status:', 'yellow');
          log(`   https://github.com/${repo}/actions\n`, 'yellow');
        }
      }
    } catch (e) {
      // Git not available or not a git repo
    }
  } catch (e) {
    // execSync not available
  }
}

checkDeployment().catch((error) => {
  log(`\n❌ Error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});


