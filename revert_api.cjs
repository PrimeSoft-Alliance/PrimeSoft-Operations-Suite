const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // 1. Completely revert the damage of /v1/ -> api
  content = content.replace(/\/v1\//g, 'api');
  
  // 2. Properly convert fetch endpoints from `/api/` to `/v1/`
  // We match Quotes/Backticks followed by /api/
  content = content.replace(/(['"`])\/api\//g, '$1/v1/');
  
  fs.writeFileSync(file, content);
});
