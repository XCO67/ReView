/**
 * Database Module - Backward Compatibility Export
 * 
 * This file provides backward compatibility for existing imports.
 * New code should import from @/lib/database/connection instead.
 * 
 * @deprecated Use @/lib/database/connection instead
 */

export { getDb, initDb } from './database/connection';
