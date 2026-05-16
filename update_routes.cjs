const fs = require('fs');

const fileNames = [
  'src/api/routes/public.ts',
  'src/api/routes/superadmin.ts',
  'src/api/routes/dashboard.ts',
  'src/api/routes/ai.ts'
];

fileNames.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Inject import
  if (!content.includes('EnvelopeResponse')) {
    content = content.replace(/(import express from 'express';\n)/, "$1import { EnvelopeResponse } from '../middlewares/envelope';\n");
  }

  // Inject const envRes
  content = content.replace(/router\.(get|post|put|patch|delete)\(['`"].*?['`"],.*?(req, res)(, next)?.*?\s*=>\s*\{/g, (match) => {
    return `${match}\n  const envRes = res as any as EnvelopeResponse;`; // adding `as any` just globally since it's cleaner than replacing Express typings
  });

  // Replace error
  content = content.replace(/res\.status\((\d+)\)\.json\(\{\s*error:\s*(.*?)(?:,\s*message:\s*(.*?))?\s*}\)/g, (match, code, err, msg) => {
    if (msg) {
       return `envRes.sendError(${code}, 'API_ERROR', ${err} + ': ' + ${msg})`;
    }
    return `envRes.sendError(${code}, 'API_ERROR', ${err})`;
  });

  // Replace success formats
  content = content.replace(/res\.json\(\{.*success:\s*true,\s*data:\s*(.*?)\s*\}\)/g, "envRes.sendSuccess($1)");
  content = content.replace(/res\.status\(201\)\.json\((.*?)\)/g, "envRes.sendSuccess($1)");
  content = content.replace(/res\.json\(\{\s*success:\s*true(.*?)\}\)/g, (match, rest) => {
      if (rest.trim() == '') return 'envRes.sendSuccess({ success: true })';
      // extract key-value
      return `envRes.sendSuccess({ ${rest.replace(/^,\s*/, '')} })`;
  });
  
  // finally res.json(...)
  content = content.replace(/res\.json\((.*?)\)/g, "envRes.sendSuccess($1)");

  // quick fix: envRes.sendSuccess({ success: true }) inside the 201 catch sometimes, but we are ok
  fs.writeFileSync(file, content);
});
