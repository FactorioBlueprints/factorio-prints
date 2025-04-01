import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SingleTagSelector from './SingleTagSelector';
import { useTags } from '../hooks/useTags';

// Mock the router
const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
	useNavigate: () => mockNavigate,
}));

// Mock the useTags hook
vi.mock('../hooks/useTags');

// Mock react-select
vi.mock('react-select', () => ({
	default: ({
		value,
		options,
		onChange,
		placeholder,
		isLoading,
		className,
		isClearable,
		isSearchable,
		closeMenuOnSelect,
		isMulti,
	}) =>
	{
		const handleChange = (event) =>
		{
			const selectedValue = event.target.value;
			const selectedOption = options.find((opt) => opt.value === selectedValue);
			if (selectedOption && onChange)
			{
				onChange(selectedOption);
			}
		};

		// Find the matching option if value is provided
		let selectValue = '';
		if (value)
		{
			// The value passed has normalized tag, but options have full path
			const matchingOption = options.find(opt =>
			{
				const normalizedOptionValue = opt.value.replace(/^\/|\/$/g, '');
				return normalizedOptionValue === value.value;
			});
			selectValue = matchingOption ? matchingOption.value : '';
		}

		return (
			<div data-testid='react-select' className={className}>
				<select
					data-testid='tag-select'
					value={selectValue}
					onChange={handleChange}
					disabled={isLoading}
				>
					<option value=''>{placeholder}</option>
					{options.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
				{isLoading && <div data-testid='select-loading'>Loading...</div>}
				<div data-testid='select-props'>
					{JSON.stringify({
						isClearable,
						isSearchable,
						closeMenuOnSelect,
						isMulti,
						hasValue: !!value,
					})}
				</div>
			</div>
		);
	},
}));

const mockTagsData = {
	tagHierarchy: {
		category1: ['tag1', 'tag2'],
		category2: ['tag3', 'tag4'],
	},
	tags: ['/category1/tag1/', '/category1/tag2/', '/category2/tag3/', '/category2/tag4/'],
};

describe('SingleTagSelector', () =>
{
	let queryClient;

	beforeEach(() =>
	{
		queryClient = new QueryClient({
			defaultOptions: {
				queries: {
					retry: false,
				},
			},
		});

		vi.clearAllMocks();
	});

	const wrapper = ({ children }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	it('should render with loading state', () =>
	{
		vi.mocked(useTags).mockReturnValue({
			data     : null,
			isLoading: true,
			isError  : false,
			error    : null,
		});

		render(<SingleTagSelector />, { wrapper });

		expect(screen.getByTestId('tag-select')).toBeDisabled();
		expect(screen.getByTestId('select-loading')).toBeInTheDocument();
	});

	it('should render with tag options when data is loaded', () =>
	{
		vi.mocked(useTags).mockReturnValue({
			data     : mockTagsData,
			isLoading: false,
			isError  : false,
			error    : null,
		});

		render(<SingleTagSelector />, { wrapper });

		const select = screen.getByTestId('tag-select');
		expect(select).not.toBeDisabled();

		// Check that options are rendered with formatted labels
		const options = screen.getAllByRole('option');
		expect(options).toHaveLength(5); // placeholder + 4 tags
		expect(options[1]).toHaveTextContent('› category1 › tag1 ›');
		expect(options[2]).toHaveTextContent('› category1 › tag2 ›');
		expect(options[3]).toHaveTextContent('› category2 › tag3 ›');
		expect(options[4]).toHaveTextContent('› category2 › tag4 ›');
	});

	it('should display current tag as selected', () =>
	{
		vi.mocked(useTags).mockReturnValue({
			data     : mockTagsData,
			isLoading: false,
			isError  : false,
			error    : null,
		});

		render(<SingleTagSelector currentTag='category1/tag1' />, { wrapper });

		const select = screen.getByTestId('tag-select');
		expect(select.value).toBe('/category1/tag1/');
	});

	it('should normalize current tag by removing leading/trailing slashes', () =>
	{
		vi.mocked(useTags).mockReturnValue({
			data     : mockTagsData,
			isLoading: false,
			isError  : false,
			error    : null,
		});

		render(<SingleTagSelector currentTag='/category1/tag1/' />, { wrapper });

		const select = screen.getByTestId('tag-select');
		expect(select.value).toBe('/category1/tag1/');
	});

	it('should navigate to correct route when tag is selected', () =>
	{
		vi.mocked(useTags).mockReturnValue({
			data     : mockTagsData,
			isLoading: false,
			isError  : false,
			error    : null,
		});

		render(<SingleTagSelector currentTag='category1/tag1' />, { wrapper });

		const select = screen.getByTestId('tag-select');

		// Select a different tag
		fireEvent.change(select, { target: { value: '/category2/tag3/' } });

		expect(mockNavigate).toHaveBeenCalledWith({
			to    : '/tagged/$category/$name',
			params: { category: 'category2', name: 'tag3' },
		});
	});

	it('should not navigate when selecting the same tag', () =>
	{
		vi.mocked(useTags).mockReturnValue({
			data     : mockTagsData,
			isLoading: false,
			isError  : false,
			error    : null,
		});

		render(<SingleTagSelector currentTag='category1/tag1' />, { wrapper });

		const select = screen.getByTestId('tag-select');

		// Select the same tag
		fireEvent.change(select, { target: { value: '/category1/tag1/' } });

		expect(mockNavigate).not.toHaveBeenCalled();
	});

	it('should handle empty tags data', () =>
	{
		vi.mocked(useTags).mockReturnValue({
			data     : { tagHierarchy: {}, tags: [] },
			isLoading: false,
			isError  : false,
			error    : null,
		});

		render(<SingleTagSelector />, { wrapper });

		const select = screen.getByTestId('tag-select');
		expect(select).not.toBeDisabled();

		// Only placeholder should be present
		const options = select.querySelectorAll('option');
		expect(options).toHaveLength(1);
		expect(options[0].value).toBe('');
	});

	it('should handle null tags data', () =>
	{
		vi.mocked(useTags).mockReturnValue({
			data     : null,
			isLoading: false,
			isError  : false,
			error    : null,
		});

		render(<SingleTagSelector />, { wrapper });

		const select = screen.getByTestId('tag-select');
		expect(select).not.toBeDisabled();

		// Only placeholder should be present
		const options = select.querySelectorAll('option');
		expect(options).toHaveLength(1);
		expect(options[0].value).toBe('');
	});

	it('should log error for invalid tag format', () =>
	{
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() =>
		{});

		vi.mocked(useTags).mockReturnValue({
			data: {
				tagHierarchy: { invalid: ['tag'] },
				tags        : ['invalidtag'], // Tag without proper format
			},
			isLoading: false,
			isError  : false,
			error    : null,
		});

		render(<SingleTagSelector />, { wrapper });

		const select = screen.getByTestId('tag-select');
		fireEvent.change(select, { target: { value: 'invalidtag' } });

		expect(consoleSpy).toHaveBeenCalledWith(
			'Invalid tag format: "invalidtag" should have exactly one slash',
		);
		expect(mockNavigate).not.toHaveBeenCalled();

		consoleSpy.mockRestore();
	});

	it('should render with correct Select props', () =>
	{
		vi.mocked(useTags).mockReturnValue({
			data     : mockTagsData,
			isLoading: false,
			isError  : false,
			error    : null,
		});

		render(<SingleTagSelector currentTag='category1/tag1' />, { wrapper });

		const selectProps = JSON.parse(screen.getByTestId('select-props').textContent);

		expect(selectProps).toEqual({
			isClearable      : false,
			isSearchable     : true,
			closeMenuOnSelect: true,
			isMulti          : false,
			hasValue         : true,
		});
	});

	it('should show placeholder when no tag is selected', () =>
	{
		vi.mocked(useTags).mockReturnValue({
			data     : mockTagsData,
			isLoading: false,
			isError  : false,
			error    : null,
		});

		render(<SingleTagSelector />, { wrapper });

		expect(screen.getByText('Select or search for a tag')).toBeInTheDocument();
	});

	it('should handle tag with multiple slashes correctly', () =>
	{
		vi.mocked(useTags).mockReturnValue({
			data: {
				tagHierarchy: { 'category/subcategory': ['tag'] },
				tags        : ['/category/subcategory/tag/'],
			},
			isLoading: false,
			isError  : false,
			error    : null,
		});

		render(<SingleTagSelector />, { wrapper });

		const select = screen.getByTestId('tag-select');

		// This should log an error as it has more than one slash
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() =>
		{});
		fireEvent.change(select, { target: { value: '/category/subcategory/tag/' } });

		expect(consoleSpy).toHaveBeenCalledWith(
			'Invalid tag format: "category/subcategory/tag" should have exactly one slash',
		);
		expect(mockNavigate).not.toHaveBeenCalled();

		consoleSpy.mockRestore();
	});

	it('should handle undefined currentTag prop', () =>
	{
		vi.mocked(useTags).mockReturnValue({
			data     : mockTagsData,
			isLoading: false,
			isError  : false,
			error    : null,
		});

		render(<SingleTagSelector currentTag={undefined} />, { wrapper });

		const select = screen.getByTestId('tag-select');
		expect(select.value).toBe('');

		const selectProps = JSON.parse(screen.getByTestId('select-props').textContent);
		expect(selectProps.hasValue).toBe(false);
	});

	it('should handle empty string currentTag', () =>
	{
		vi.mocked(useTags).mockReturnValue({
			data     : mockTagsData,
			isLoading: false,
			isError  : false,
			error    : null,
		});

		render(<SingleTagSelector currentTag='' />, { wrapper });

		const select = screen.getByTestId('tag-select');
		expect(select.value).toBe('');

		const selectProps = JSON.parse(screen.getByTestId('select-props').textContent);
		expect(selectProps.hasValue).toBe(false);
	});

	it('should format tag values correctly in options', () =>
	{
		vi.mocked(useTags).mockReturnValue({
			data: {
				tagHierarchy: {
					'category-with-dash'      : ['tag-with-dash'],
					'category_with_underscore': ['tag_with_underscore'],
				},
				tags: [
					'/category-with-dash/tag-with-dash/',
					'/category_with_underscore/tag_with_underscore/',
				],
			},
			isLoading: false,
			isError  : false,
			error    : null,
		});

		render(<SingleTagSelector />, { wrapper });

		// Check that dashes and underscores are preserved but slashes are replaced
		const options = screen.getAllByRole('option');
		expect(options).toHaveLength(3); // placeholder + 2 tags
		expect(options[1]).toHaveTextContent('› category-with-dash › tag-with-dash ›');
		expect(options[2]).toHaveTextContent('› category_with_underscore › tag_with_underscore ›');
	});
});
