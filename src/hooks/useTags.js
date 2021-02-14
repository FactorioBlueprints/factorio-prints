import {useState, useEffect} from 'react';

const useTags = () =>
{
	const [status, setStatus] = useState('idle');
	const [tags, setTags] = useState([]);

	useEffect(() =>
	{
		const fetchData = async () =>
		{
			setStatus('fetching');
			const response = await fetch(`${process.env.REACT_APP_REST_URL}/api/tags`);
			const data = await response.json();
			const tags = data.map(each => `/${each.category}/${each.name}/`);
			setTags(tags);
			setStatus('fetched');
		};

		fetchData();
	}, []);

	return {status, tags};
};

export default useTags;
