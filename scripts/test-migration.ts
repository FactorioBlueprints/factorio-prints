#!/usr/bin/env tsx

import * as fs from 'node:fs';
import {type ProcessedThread} from './disqus-export';

// Create test Disqus XML export data
const testXml = `<?xml version="1.0" encoding="UTF-8"?>
<disqus xmlns="http://disqus.com"
        xmlns:dsq="http://disqus.com/disqus-internals"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://disqus.com/api/schemas/1.0/disqus.xsd">

  <category dsq:id="1234567">
    <forum>factorioprints</forum>
    <title>General</title>
    <isDefault>true</isDefault>
  </category>

  <thread dsq:id="thread_1">
    <id>https://factorioprints.com/view/abc123</id>
    <forum>factorioprints</forum>
    <category dsq:id="1234567"/>
    <link>https://factorioprints.com/view/abc123</link>
    <title>Efficient Iron Smelting Setup</title>
    <createdAt>2023-01-15T10:30:00Z</createdAt>
    <author>
      <email>admin@factorioprints.com</email>
      <name>Admin</name>
      <isAnonymous>false</isAnonymous>
    </author>
    <isClosed>false</isClosed>
    <isDeleted>false</isDeleted>
  </thread>

  <thread dsq:id="thread_2">
    <id>https://factorioprints.com/view/xyz789</id>
    <forum>factorioprints</forum>
    <category dsq:id="1234567"/>
    <link>https://factorioprints.com/view/xyz789</link>
    <title>Compact Solar Array</title>
    <createdAt>2023-02-20T14:45:00Z</createdAt>
    <author>
      <email>admin@factorioprints.com</email>
      <name>Admin</name>
      <isAnonymous>false</isAnonymous>
    </author>
    <isClosed>false</isClosed>
    <isDeleted>false</isDeleted>
  </thread>

  <!-- Root comment on thread_1 -->
  <post dsq:id="comment_1">
    <id>comment_1</id>
    <message>This is a great design! Very efficient use of space.</message>
    <createdAt>2023-01-15T11:00:00Z</createdAt>
    <isDeleted>false</isDeleted>
    <isSpam>false</isSpam>
    <author>
      <email>user1@example.com</email>
      <name>FactorioFan</name>
      <isAnonymous>false</isAnonymous>
      <username>factorio_fan</username>
    </author>
    <thread dsq:id="thread_1"/>
  </post>

  <!-- Reply to comment_1 -->
  <post dsq:id="comment_2">
    <id>comment_2</id>
    <message>Thanks! I've been optimizing this for weeks.</message>
    <createdAt>2023-01-15T12:30:00Z</createdAt>
    <isDeleted>false</isDeleted>
    <isSpam>false</isSpam>
    <author>
      <email>blueprintauthor@example.com</email>
      <name>BlueprintMaster</name>
      <isAnonymous>false</isAnonymous>
      <username>blueprint_master</username>
    </author>
    <thread dsq:id="thread_1"/>
    <parent dsq:id="comment_1"/>
  </post>

  <!-- Another root comment on thread_1 -->
  <post dsq:id="comment_3">
    <id>comment_3</id>
    <message>How does this compare to using steel furnaces?</message>
    <createdAt>2023-01-16T09:15:00Z</createdAt>
    <isDeleted>false</isDeleted>
    <isSpam>false</isSpam>
    <author>
      <email>user2@example.com</email>
      <name>CuriousEngineer</name>
      <isAnonymous>false</isAnonymous>
    </author>
    <thread dsq:id="thread_1"/>
  </post>

  <!-- Spam comment (to test filtering) -->
  <post dsq:id="comment_4">
    <id>comment_4</id>
    <message>Buy cheap gold at www.spam.com!!!</message>
    <createdAt>2023-01-17T03:00:00Z</createdAt>
    <isDeleted>false</isDeleted>
    <isSpam>true</isSpam>
    <author>
      <email>spammer@spam.com</email>
      <name>Spammer</name>
      <isAnonymous>false</isAnonymous>
    </author>
    <thread dsq:id="thread_1"/>
  </post>

  <!-- Comment on thread_2 -->
  <post dsq:id="comment_5">
    <id>comment_5</id>
    <message>Perfect for my megabase!</message>
    <createdAt>2023-02-21T10:00:00Z</createdAt>
    <isDeleted>false</isDeleted>
    <isSpam>false</isSpam>
    <author>
      <email>megabase@example.com</email>
      <name>MegabaseBuilder</name>
      <isAnonymous>false</isAnonymous>
      <username>megabase_builder</username>
    </author>
    <thread dsq:id="thread_2"/>
  </post>

  <!-- Deleted comment (to test filtering) -->
  <post dsq:id="comment_6">
    <id>comment_6</id>
    <message>[deleted]</message>
    <createdAt>2023-02-22T11:00:00Z</createdAt>
    <isDeleted>true</isDeleted>
    <isSpam>false</isSpam>
    <author>
      <email>deleted@example.com</email>
      <name>DeletedUser</name>
      <isAnonymous>false</isAnonymous>
    </author>
    <thread dsq:id="thread_2"/>
  </post>
</disqus>`;

// Create test files
console.log('🧪 Creating test Disqus XML export...');
fs.writeFileSync('test-disqus-export.xml', testXml);

console.log('✅ Test file created: test-disqus-export.xml');
console.log('\n📝 Test data contains:');
console.log('   - 2 threads (blueprints: abc123, xyz789)');
console.log('   - 6 comments total');
console.log('   - 1 comment with reply (nested)');
console.log('   - 1 spam comment');
console.log('   - 1 deleted comment');

console.log('\n🚀 You can now test the migration with:');
console.log('\n1. Export to JSON:');
console.log('   tsx scripts/disqus-export.ts test-disqus-export.xml test-comments.json');
console.log('\n2. Test migration (dry run):');
console.log(
	'   tsx scripts/migrate-to-firebase.ts --dry-run service-account.json https://your-app.firebaseio.com test-comments.json',
);
console.log('\n3. Test with spam filtering:');
console.log(
	'   tsx scripts/migrate-to-firebase.ts --dry-run --skip-spam service-account.json https://your-app.firebaseio.com test-comments.json',
);
