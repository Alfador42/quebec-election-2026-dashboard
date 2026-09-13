import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {findProject,resourcePath} from '../desktop/files.mjs';

test('desktop resolves project from nested release directory',()=>{
  assert.equal(findProject([path.resolve('desktop-app/win-unpacked')]),process.cwd());
});
test('desktop serves live dataset while restricting other files',()=>{
  assert.equal(resourcePath('quebec://dashboard/data/dashboard.json','dist','project'),path.join('project','public/data/dashboard.json'));
  for(const url of ['https://evil.example/assets/a.js','quebec://other/assets/a.js','quebec://dashboard/data/state.json','quebec://dashboard/assets/%2e%2e%5csecret.js']) assert.equal(resourcePath(url,'dist','project'),null);
  assert.equal(resourcePath('quebec://dashboard/assets/main-123.js','dist','project'),path.join('dist','assets/main-123.js'));
});
