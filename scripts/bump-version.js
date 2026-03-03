#!/usr/bin/env node

/**
 * Version bump script with auto commit, tag, and push
 * Usage: node scripts/bump-version.js [patch|minor|major] [--push] [--remote=<remote>]
 * Or via npm: npm run version:patch | npm run version:minor | npm run version:major
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const packageJsonPath = path.join(process.cwd(), 'package.json');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

const log = (msg, color = 'reset') => console.log(`${colors[color]}${msg}${colors.reset}`);

// Execute git command and return output
function execGit(command, options = {}) {
  try {
    return execSync(command, { encoding: 'utf-8', stdio: options.silent ? 'pipe' : 'inherit', ...options }).trim();
  } catch (error) {
    if (options.ignoreError) return null;
    throw error;
  }
}

// Check if we're in a git repo
function isGitRepo() {
  return execGit('git rev-parse --git-dir', { silent: true, ignoreError: true }) !== null;
}

// Check if there are uncommitted changes
function hasUncommittedChanges() {
  const status = execGit('git status --porcelain', { silent: true });
  return status && status.length > 0;
}

// Get list of remotes
function getRemotes() {
  const output = execGit('git remote', { silent: true, ignoreError: true });
  return output ? output.split('\n').filter(r => r) : [];
}

// Get current branch
function getCurrentBranch() {
  return execGit('git branch --show-current', { silent: true });
}

// Prompt user for input
function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// Multi-select prompt for remotes
async function selectRemotes(remotes) {
  if (remotes.length === 0) {
    log('No remotes found!', 'red');
    return [];
  }

  if (remotes.length === 1) {
    const answer = await prompt(`Push to ${remotes[0]}? (Y/n): `);
    return answer.toLowerCase() !== 'n' ? remotes : [];
  }

  log('\nAvailable remotes:', 'cyan');
  remotes.forEach((remote, index) => {
    log(`  [${index + 1}] ${remote}`, 'blue');
  });
  log('  [a] All remotes', 'blue');
  log('  [n] None (skip push)', 'blue');

  const answer = await prompt('\nSelect remotes (comma-separated numbers, or a/n): ');

  if (answer.toLowerCase() === 'n') {
    return [];
  }

  if (answer.toLowerCase() === 'a') {
    return remotes;
  }

  const selected = answer.split(',').map(s => parseInt(s.trim()) - 1).filter(i => i >= 0 && i < remotes.length);
  return selected.map(i => remotes[i]);
}

async function main() {
  // Read current package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const currentVersion = packageJson.version || '0.0.0';

  // Parse arguments
  const bumpType = process.argv[2] || 'patch';
  const shouldPush = process.argv.includes('--push') || process.argv.includes('-p');
  const remoteArg = process.argv.find(arg => arg.startsWith('--remote='));
  const specifiedRemote = remoteArg ? remoteArg.split('=')[1] : null;

  // Parse version parts
  const [major, minor, patch] = currentVersion.split('.').map(Number);

  let newVersion;
  switch (bumpType) {
    case 'major':
      newVersion = `${major + 1}.0.0`;
      break;
    case 'minor':
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case 'patch':
    default:
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
  }

  log(`🚀 Bumping version: ${currentVersion} → ${newVersion}\n`, 'green');

  // Check if we're in a git repo
  if (!isGitRepo()) {
    log('⚠️  Not a git repository. Only updating package.json', 'yellow');
    updatePackageJson(newVersion);
    return;
  }

  // Check for uncommitted changes
  if (hasUncommittedChanges()) {
    log('⚠️  You have uncommitted changes:', 'yellow');
    execGit('git status -s');
    const proceed = await prompt('\nProceed anyway? (y/N): ');
    if (proceed.toLowerCase() !== 'y') {
      log('Aborted', 'red');
      process.exit(1);
    }
  }

  // Update package.json
  packageJson.version = newVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  log(`✅ Updated package.json to v${newVersion}`, 'green');

  // Stage package.json
  execGit('git add package.json');
  log('📦 Staged package.json', 'blue');

  // Commit
  const commitMessage = `bump v${newVersion}`;
  execGit(`git commit -m "${commitMessage}"`);
  log(`✅ Created commit: "${commitMessage}"`, 'green');

  // Create tag
  const tagName = `v${newVersion}`;
  execGit(`git tag -a ${tagName} -m "Release ${tagName}"`);
  log(`🏷️  Created tag: ${tagName}`, 'cyan');

  // Push
  const remotes = getRemotes();
  if (remotes.length === 0) {
    log('⚠️  No remotes configured. Skipping push.', 'yellow');
    return;
  }

  let selectedRemotes = [];

  if (specifiedRemote) {
    if (remotes.includes(specifiedRemote)) {
      selectedRemotes = [specifiedRemote];
    } else {
      log(`⚠️  Remote '${specifiedRemote}' not found. Available: ${remotes.join(', ')}`, 'red');
      selectedRemotes = await selectRemotes(remotes);
    }
  } else if (shouldPush) {
    // Auto-push to all remotes if --push flag is used
    selectedRemotes = remotes;
  } else {
    // Interactive selection
    selectedRemotes = await selectRemotes(remotes);
  }

  if (selectedRemotes.length === 0) {
    log('⏭️  Skipping push', 'yellow');
  } else {
    const branch = getCurrentBranch();

    for (const remote of selectedRemotes) {
      log(`\n📤 Pushing to ${remote}...`, 'blue');
      try {
        execGit(`git push ${remote} ${branch}`);
        execGit(`git push ${remote} ${tagName}`);
        log(`✅ Pushed to ${remote} successfully`, 'green');
      } catch (error) {
        log(`❌ Failed to push to ${remote}`, 'red');
      }
    }
  }

  // Summary
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log(`Version ${newVersion} released!`, 'green');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'cyan');
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
