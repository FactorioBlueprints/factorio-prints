// https://www.zacfukuda.com/blog/pagination-algorithm

function paginate({current, max})
{
	if (!current || !max)
	{
		return null;
	}

	let prev  = current === 1 ? null : current - 1,
		next  = current === max ? null : current + 1,
		items = [1];

	if (current === 1 && max === 1)
	{
		return {current, prev, next, items};
	}
	if (current > 4)
	{
		items.push('…');
	}

	let r = 2, r1 = current - r, r2 = current + r;

	for (let i = r1 > 2 ? r1 : 2; i <= Math.min(max, r2); i++)
	{
		items.push(i);
	}

	if (r2 + 1 < max)
	{
		items.push('…');
	}
	if (r2 < max)
	{
		items.push(max);
	}

	return {current, prev, next, items}
}

export default paginate;
