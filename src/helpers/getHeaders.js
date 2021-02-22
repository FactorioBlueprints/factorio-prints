function getHeaders(idToken)
{
	return {
		headers: {
			Authorization: `Bearer ${idToken}`,
		},
	};
}

export default getHeaders;
