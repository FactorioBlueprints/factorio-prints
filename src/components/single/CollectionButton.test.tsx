import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import {ref, update} from 'firebase/database';

import UserContext from '../../context/userContext';
import CollectionButton from './CollectionButton';

jest.mock('axios', () => ({__esModule: true, default: {get: jest.fn(), put: jest.fn()}}));
jest.mock('firebase/database', () => ({
	getDatabase: jest.fn(),
	ref: jest.fn(),
	update: jest.fn(),
}));
jest.mock('../../base', () => ({app: {}}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const user = {uid: 'user1', getIdToken: async () => 'token'};

function renderButton() {
	const queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}});
	render(
		<QueryClientProvider client={queryClient}>
			<UserContext.Provider value={{user} as never}>
				<CollectionButton blueprintKey="blueprint1" />
			</UserContext.Provider>
		</QueryClientProvider>,
	);
}

describe('CollectionButton', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(ref as jest.Mock).mockReturnValue('root');
		mockedAxios.put.mockResolvedValue({data: null});
	});

	it('adds to the collection through both the REST API and Firebase', async () => {
		mockedAxios.get.mockResolvedValue({data: false});
		renderButton();

		const button = await screen.findByRole('button', {name: /add to collection/i});
		await waitFor(() => expect(button).toBeEnabled());
		await userEvent.click(button);

		await waitFor(() => expect(mockedAxios.put).toHaveBeenCalledTimes(1));
		expect(mockedAxios.put.mock.calls[0][0]).toMatch(/\/api\/my\/collection\/blueprint1$/);
		expect(mockedAxios.put.mock.calls[0][2]?.params).toEqual({isInCollection: true});
		expect(update).toHaveBeenCalledWith('root', {'/users/user1/collection/blueprint1': true});
	});

	it('removes from the collection through both the REST API and Firebase', async () => {
		mockedAxios.get.mockResolvedValue({data: true});
		renderButton();

		const button = await screen.findByRole('button', {name: /remove from collection/i});
		await userEvent.click(button);

		await waitFor(() => expect(mockedAxios.put).toHaveBeenCalledTimes(1));
		expect(mockedAxios.put.mock.calls[0][2]?.params).toEqual({isInCollection: false});
		expect(update).toHaveBeenCalledWith('root', {'/users/user1/collection/blueprint1': null});
	});
});
