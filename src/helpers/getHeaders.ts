function getHeaders(idToken: string)
{
	return {
		headers: {
			Authorization: `Bearer ${idToken}`,
		},
	};
}

export default getHeaders;
