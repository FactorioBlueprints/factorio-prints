import { execSync } from 'child_process';

function getGitVersion()
{
	// Check for exact tag match on current commit
	const exactTag = execSync('git describe --tags --exact-match HEAD 2>/dev/null || echo ""', { encoding: 'utf8' }).trim();
	if (exactTag && exactTag.startsWith('prod.'))
	{
		return exactTag;
	}

	// Get the most recent prod tag
	const latestProdTag = execSync("git tag -l 'prod.*' | sort -V | tail -1", { encoding: 'utf8' }).trim();
	if (!latestProdTag)
	{
		throw new Error('No prod.* tags found in git repository');
	}

	// Get number of commits since that tag
	const commitsSince = execSync(`git rev-list ${latestProdTag}..HEAD --count`, { encoding: 'utf8' }).trim();
	if (commitsSince === '0')
	{
		return latestProdTag;
	}

	// Return tag with commit count and short hash
	const shortHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
	return `${latestProdTag}-${commitsSince}-g${shortHash}`;
}

export default getGitVersion;
