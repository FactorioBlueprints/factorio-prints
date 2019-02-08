import constant    from 'lodash/constant';
import isUndefined from 'lodash/isUndefined';
import map         from 'lodash/map';
import orderBy     from 'lodash/orderBy';
import toPairs     from 'lodash/toPairs';

class FirebasePaginatorByValue
{
	currentPage = 0;

	isStarted   = false;

	isLastPage  = false;

	loading     = false;

	data        = [];

	constructor(ref, pageSize, childPropertyName)
	{
		this.ref               = ref;
		this.pageSize          = pageSize;
		this.childPropertyName = childPropertyName;
	}

	start = () =>
	{
		if (this.isStarted)
		{
			throw Error();
		}
		return this.first();
	};

	next     = () => this.load(this.getNextRef, page => page + 1);

	previous = () => this.load(this.getPreviousRef, page => page - 1);

	first    = () =>
	{
		this.nextCursorValue     = null;
		this.nextCursorKey       = null;
		this.previousCursorValue = null;
		this.previousCursorKey   = null;
		return this.load(this.getFirstRef, constant(1));
	};

	load = (getRef, changePageBy) =>
	{
		this.currentPage = changePageBy(this.currentPage);
		this.loading     = true;
		this.data        = [];
		this.pageRef     = getRef();
		this.isStarted   = true;
		return this.pageRef.once('value')
			.then(this.onfulfilled)
			.catch(this.onrejected);
	};

	getNextRef = () =>
	{
		const orderedRef   = this.ref.orderByChild(this.childPropertyName);
		const truncatedRef = isUndefined(this.nextCursorValue) ? orderedRef : orderedRef.endAt(this.nextCursorValue, this.nextCursorKey);
		return truncatedRef.limitToLast(this.pageSize + 1);
	};

	getPreviousRef = () =>
	{
		const orderedRef   = this.ref.orderByChild(this.childPropertyName);
		const truncatedRef = isUndefined(this.previousCursorValue) ? orderedRef : orderedRef.startAt(this.previousCursorValue, this.previousCursorKey);
		return truncatedRef.limitToFirst(this.pageSize + 1);
	};

	getFirstRef = () => this.ref.orderByChild(this.childPropertyName).limitToLast(this.pageSize + 1);

	onfulfilled = (firebaseDataSnapshot) =>
	{
		const dataSnapshotVal = firebaseDataSnapshot.val();
		const pairs           = toPairs(dataSnapshotVal);
		const unsorted        = map(pairs, pair => ({key: pair[0], ...pair[1]}));
		const sorted          = orderBy(unsorted, [this.childPropertyName, 'key'], ['desc', 'desc']);
		const sliced          = sorted.slice(0, this.pageSize);
		this.data             = sliced;

		this.loading    = false;
		this.isLastPage = pairs.length <= this.pageSize;

		if (this.isLastPage)
		{
			this.nextCursorValue = null;
			this.nextCursorKey   = null;
		}
		else
		{
			const lastData       = sorted[this.pageSize];
			this.nextCursorKey   = lastData.key;
			this.nextCursorValue = lastData[this.childPropertyName];
		}

		if (this.currentPage === 1)
		{
			this.previousCursorValue = null;
			this.previousCursorKey   = null;
		}
		else
		{
			const firstData          = sorted[0];
			this.previousCursorKey   = firstData.key;
			this.previousCursorValue = firstData[this.childPropertyName];
		}
	};

	onrejected = (error) =>
	{
		console.log('FirebasePaginatorByValue.onrejected', {error});
		this.data       = [];
		this.loading    = false;
		this.isLastPage = false;
		this.error      = error;
	};
}

export default FirebasePaginatorByValue;
