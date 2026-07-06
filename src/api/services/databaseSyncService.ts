import { Settings } from '../models';
import { MongoClient } from 'mongodb';
import pg from 'pg';
import mysql from 'mysql2/promise';

export class DatabaseSyncService {
  static async getTables(clientId: string, configOverride?: any): Promise<string[]> {
    let config: any;
    if (configOverride) {
      config = configOverride;
    } else {
      const settings = await Settings.findOne({ clientId });
      if (!settings?.externalDbConfig?.enabled && !configOverride) {
        throw new Error('External database sync is not enabled');
      }
      config = settings.externalDbConfig;
    }

    if (!config) throw new Error('No database configuration provided');

    const dbType = config.type || config.dbType;
    const dbName = config.database || config.databaseName;

    if (dbType === 'mongodb') {
      const url = config.connectionString || config.host || process.env.MONGODB_URI!;
      const client = new MongoClient(url);
      await client.connect();
      const db = (dbName && dbName !== 'Primary' && dbName !== 'postgres') ? client.db(dbName) : client.db();
      const collections = await db.listCollections().toArray();
      await client.close();
      return collections.map(c => c.name);
    }

    if (dbType === 'postgres') {
      const pgConfig = config.connectionString 
        ? { connectionString: config.connectionString, ssl: config.ssl ? { rejectUnauthorized: false } : false }
        : {
            host: config.host,
            port: config.port,
            database: dbName,
            user: config.user,
            password: config.password,
            ssl: config.ssl ? { rejectUnauthorized: false } : false
          };
      const client = new pg.Client(pgConfig);
      await client.connect();
      const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' OR table_schema = 'dbo'");
      await client.end();
      return res.rows.map(r => r.table_name);
    }

    if (dbType === 'mysql') {
      const connection = config.connectionString
        ? await mysql.createConnection(config.connectionString)
        : await mysql.createConnection({
            host: config.host,
            port: config.port,
            database: dbName,
            user: config.user,
            password: config.password,
            ssl: config.ssl ? { rejectUnauthorized: false } : undefined
          });
      const [rows] = await connection.query('SHOW TABLES');
      await connection.end();
      return (rows as any[]).map(r => String(Object.values(r)[0]));
    }

    if (dbType === 'sqlserver' || dbType === 'mssql') {
      const mssql = await import('mssql');
      const mssqlConfig = config.connectionString 
        ? config.connectionString
        : {
            user: config.user,
            password: config.password,
            server: config.host,
            database: dbName,
            port: config.port || 1433,
            options: {
              encrypt: true,
              trustServerCertificate: true
            }
          };
      const pool = await mssql.connect(mssqlConfig);
      const res = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'");
      await pool.close();
      return res.recordset.map(r => r.TABLE_NAME);
    }

    throw new Error(`Database type ${dbType} not supported yet`);
  }

  static async exploreData(clientId: string, tableName: string, limit: number = 20, configOverride?: any, offset: number = 0): Promise<any[]> {
    console.log(`[DatabaseSyncService] exploreData called for client ${clientId}, table ${tableName}, limit ${limit}, offset ${offset}`);
    let config: any;
    if (configOverride) {
      config = configOverride;
      console.log(`[DatabaseSyncService] Using config override for ${config.type} database`);
    } else {
      const settings = await Settings.findOne({ clientId });
      if (!settings?.externalDbConfig?.enabled) {
        throw new Error('External database sync is not enabled');
      }
      config = settings.externalDbConfig;
    }

    const limitNum = Number(limit) || 20;
    const offsetNum = Number(offset) || 0;

    const dbType = config.type || config.dbType;
    const dbName = config.database || config.databaseName;
    console.log(`[DatabaseSyncService] Connecting to ${dbType} database: ${dbName} (limit: ${limitNum}, offset: ${offsetNum})`);

    if (dbType === 'mongodb') {
      const url = config.connectionString || config.host || process.env.MONGODB_URI!;
      const client = new MongoClient(url);
      await client.connect();
      const db = (dbName && dbName !== 'Primary' && dbName !== 'postgres') ? client.db(dbName) : client.db();
      const data = await db.collection(tableName).find({}).skip(offsetNum).limit(limitNum).toArray();
      await client.close();
      console.log(`[DatabaseSyncService] MongoDB query returned ${data.length} records`);
      return data;
    }

    if (dbType === 'postgres') {
      const pgConfig = config.connectionString 
        ? { connectionString: config.connectionString, ssl: config.ssl ? { rejectUnauthorized: false } : false }
        : {
            host: config.host,
            port: config.port,
            database: dbName,
            user: config.user,
            password: config.password,
            ssl: config.ssl ? { rejectUnauthorized: false } : false
          };
      const client = new pg.Client(pgConfig);
      await client.connect();
      // Use query string safely since tableName is from our own getTables list
      const res = await client.query(`SELECT * FROM "${tableName}" LIMIT $1 OFFSET $2`, [limitNum, offsetNum]);
      await client.end();
      console.log(`[DatabaseSyncService] Postgres query returned ${res.rows.length} records`);
      return res.rows;
    }

    if (dbType === 'mysql') {
      const connection = config.connectionString
        ? await mysql.createConnection(config.connectionString)
        : await mysql.createConnection({
            host: config.host,
            port: config.port,
            database: dbName,
            user: config.user,
            password: config.password,
            ssl: config.ssl ? { rejectUnauthorized: false } : undefined
          });
      const [rows] = await connection.query(`SELECT * FROM ?? LIMIT ? OFFSET ?`, [tableName, limitNum, offsetNum]);
      await connection.end();
      console.log(`[DatabaseSyncService] MySQL query returned ${(rows as any[]).length} records`);
      return rows as any[];
    }

    if (dbType === 'sqlserver' || dbType === 'mssql') {
      const mssql = await import('mssql');
      const mssqlConfig = config.connectionString 
        ? config.connectionString
        : {
            user: config.user,
            password: config.password,
            server: config.host,
            database: dbName,
            port: config.port || 1433,
            options: {
              encrypt: true,
              trustServerCertificate: true
            }
          };
      const pool = await mssql.connect(mssqlConfig);
      // SQL Server pagination uses OFFSET FETCH
      const res = await pool.request().query(`SELECT * FROM [${tableName}] ORDER BY (SELECT NULL) OFFSET ${offsetNum} ROWS FETCH NEXT ${limitNum} ROWS ONLY`);
      await pool.close();
      console.log(`[DatabaseSyncService] MSSQL query returned ${res.recordset.length} records`);
      return res.recordset;
    }

    throw new Error(`Database type ${dbType} not supported yet`);
  }

  static async queryTable(clientId: string, tableName: string, searchTerms?: string, databaseName?: string): Promise<any[]> {
    const settings = await Settings.findOne({ clientId });
    if (!settings) throw new Error('Settings not found');

    // Find the right database config
    let config: any = null;
    
    if (databaseName) {
      if (settings.externalDbConfig?.enabled && (settings.externalDbConfig.name === databaseName || databaseName === 'Primary')) {
        config = settings.externalDbConfig;
      } else if (settings.externalDatabases) {
        config = settings.externalDatabases.find((db: any) => db.enabled && db.name === databaseName);
      }
    }

    // Fallback: search by table name in all enabled databases if databaseName not provided or not found
    if (!config) {
      const allConfigs = [];
      if (settings.externalDbConfig?.enabled) allConfigs.push(settings.externalDbConfig);
      if (settings.externalDatabases) allConfigs.push(...settings.externalDatabases.filter((d: any) => d.enabled));

      // Find a database config that exposes this table
      config = allConfigs.find((db: any) => db.exposedTables && db.exposedTables[tableName]?.enabled);
      if (!config) {
        // Fallback to the first enabled config
        config = allConfigs[0];
      }
    }

    if (!config) {
      throw new Error('No enabled external database found to query');
    }

    const dbType = config.type || config.dbType;
    const dbName = config.database || config.databaseName;

    if (dbType === 'mongodb') {
      const url = config.connectionString || config.host!;
      const client = new MongoClient(url);
      await client.connect();
      const db = (dbName && dbName !== 'Primary' && dbName !== 'postgres') ? client.db(dbName) : client.db();
      const query = searchTerms ? { $text: { $search: searchTerms } } : {};
      let data;
      try {
        data = await db.collection(tableName).find(query).limit(10).toArray();
      } catch (e) {
        data = await db.collection(tableName).find(searchTerms ? {
          $or: [
            { name: { $regex: searchTerms, $options: 'i' } },
            { title: { $regex: searchTerms, $options: 'i' } },
            { email: { $regex: searchTerms, $options: 'i' } },
            { description: { $regex: searchTerms, $options: 'i' } }
          ]
        } : {}).limit(10).toArray();
      }
      await client.close();
      return data;
    }

    if (dbType === 'postgres') {
      const pgConfig = config.connectionString 
        ? { connectionString: config.connectionString, ssl: config.ssl ? { rejectUnauthorized: false } : false }
        : {
            host: config.host,
            port: config.port,
            database: dbName,
            user: config.user,
            password: config.password,
            ssl: config.ssl ? { rejectUnauthorized: false } : false
          };
      const client = new pg.Client(pgConfig);
      await client.connect();
      const res = await client.query(`SELECT * FROM "${tableName}" LIMIT 20`);
      await client.end();
      const rows = res.rows;
      if (searchTerms) {
        const queryLower = searchTerms.toLowerCase();
        return rows.filter(row => JSON.stringify(row).toLowerCase().includes(queryLower)).slice(0, 10);
      }
      return rows.slice(0, 10);
    }

    if (dbType === 'mysql') {
      const connection = config.connectionString
        ? await mysql.createConnection(config.connectionString)
        : await mysql.createConnection({
            host: config.host,
            port: config.port,
            database: dbName,
            user: config.user,
            password: config.password,
            ssl: config.ssl ? { rejectUnauthorized: false } : undefined
          });
      const [rows] = await connection.execute(`SELECT * FROM \`${tableName}\` LIMIT 20`);
      await connection.end();
      const records = rows as any[];
      if (searchTerms) {
        const queryLower = searchTerms.toLowerCase();
        return records.filter(row => JSON.stringify(row).toLowerCase().includes(queryLower)).slice(0, 10);
      }
      return records.slice(0, 10);
    }

    throw new Error(`Database type ${config.type} not supported for tool querying yet`);
  }
}
