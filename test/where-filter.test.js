import whereFilter from '../where-filter';
import {expect, should, assert} from 'chai';
import {DateTime} from 'luxon';

should();

context('whereFilter', () => {
	let array;

	beforeEach(() => {
		array = [
			{id: 'order#1', qty: 10, symbol: 'IBM'},
			{id: 'order#9', qty: 90, symbol: 'AAPL'},
			{id: 'order#2', qty: 10, symbol: 'GOOG'},
			{id: 'order#5', qty: 60, symbol: 'IBM'},
			{id: 'order#7', symbol: {nyse: 'AMD'}},
		];
	});

	it('should handle simple queries', () => {
		// canonical == {name: value}
		assert.equal(array.filter(whereFilter({symbol: 'IBM'})).length, 2);

		// alternate == {name: {eq: value}}
		assert.equal(array.filter(whereFilter({symbol: {eq: 'IBM'}})).length, 2);

		// not-equal != {name: {neq: value}}
		// note that an object value (symbol: {}) is converted and compared as "[object Object]"
		assert.equal(array.filter(whereFilter({symbol: {neq: 'IBM'}})).length, 3);
	});

	it('should handle other simple named relational operators', () => {
		// lt/lte/gt/gte
		assert.equal(array.filter(whereFilter({qty: {lt: 60}})).length, 2);
		assert.equal(array.filter(whereFilter({qty: {lte: 60}})).length, 3);
		assert.equal(array.filter(whereFilter({qty: {gt: 60}})).length, 1);
		assert.equal(array.filter(whereFilter({qty: {gte: 60}})).length, 2);

		// between
		assert.equal(array.filter(whereFilter({qty: {between: [10, 60]}})).length, 3);

		// like/nlike/ilike/nilike
		assert.equal(array.filter(whereFilter({symbol: {like: 'OOG'}})).length, 1);
		assert.equal(array.filter(whereFilter({symbol: {like: 'oog'}})).length, 0);
		assert.equal(array.filter(whereFilter({symbol: {nlike: 'OOG'}})).length, 4);
		assert.equal(array.filter(whereFilter({symbol: {nlike: 'oog'}})).length, 5);
		assert.equal(array.filter(whereFilter({symbol: {ilike: 'OoG'}})).length, 1);
		assert.equal(array.filter(whereFilter({symbol: {nilike: 'oOg'}})).length, 4);

		// like with regex (it's just looking for any character that matches)
		assert.equal(array.filter(whereFilter({id: {like: '\\w+\.\\d'}})).length, 5);
		assert.equal(array.filter(whereFilter({symbol: {like: '\\w+\.\\d'}})).length, 0);

		// inq, nin
		assert.equal(array.filter(whereFilter({symbol: {inq: ['IBM', 'GOOG']}})).length, 3);
		assert.equal(array.filter(whereFilter({symbol: {nin: ['IBM', 'GOOG']}})).length, 2);
	});

	it('should handle simple query with dotted path', () => {
		const result = array.filter(whereFilter({'symbol.nyse': 'AMD'}));
		assert.equal(result[0].id, 'order#7');
	});

	it('should handle simple query with dotted path that does not match', () => {
		const result = array.filter(whereFilter({'symbol.otc': 'AMD'}));
		assert.equal(result.length, 0);
	});

	it('should match non-array AND property', () => {
		const result = [{id: 1, and: 1}, {id: 2, and: 2}].filter(whereFilter({and: 2}));
		assert.equal(result.length, 1);
		assert.equal(result[0].id, 2);
	});

	it('should match non-array OR property', () => {
		const result = [{id: 1, or: 1}, {id: 2, or: 2}].filter(whereFilter({or: 2}));
		assert.equal(result.length, 1);
		assert.equal(result[0].id, 2);
	});

	it('should handle OR queries', () => {
		const result = array.filter(whereFilter({or: [{symbol: 'IBM'}, {symbol: 'AAPL'}]}));

		result.length.should.be.equal(3);
	});

	it('should handle AND queries', () => {
		const result = array.filter(whereFilter({and: [{symbol: 'IBM'}, {qty: {lt: '50'}}]}));

		result.length.should.be.equal(1);
	});

	it('SOME query returns true when array property has at least one matching entry', () => {
		const condition = {
			lines: {
				some: {
					status: 'good',
				},
			},
		};
		const data = {
			lines: [
				{
					status: 'good',
				},
				{
					status: 'bad',
				},
			],
		};

		const result = whereFilter(condition)(data);

		assert.isTrue(result);
	});

	it('SOME query returns false when array property is empty', () => {
		const condition = {
			lines: {
				some: {
					status: 'good',
				},
			},
		};
		const data = {
			lines: [],
		};

		const result = whereFilter(condition)(data);

		assert.isFalse(result);
	});

	it('ALL query returns true when array property has no non-matching entries', () => {
		const condition = {
			lines: {
				all: {
					status: 'good',
				},
			},
		};
		const data = {
			lines: [
				{
					status: 'good',
				},
				{
					status: 'good',
				},
			],
		};

		const result = whereFilter(condition)(data);

		assert.isTrue(result);
	});

	it('ALL query returns true when array property is empty', () => {
		const condition = {
			lines: {
				all: {
					status: 'good',
				},
			},
		};
		const data = {
			lines: [],
		};

		const result = whereFilter(condition)(data);

		assert.isTrue(result);
	});

	it('ALL and SOME nest', () => {
		const condition = {
			lines: {
				some: {
					tasks: {
						all: {
							status: 'DONE',
						},
					},
				},
			},
		};
		const data = {
			lines: [
				{
					tasks: [
						{
							status: 'DONE',
						},
					],
				},
				{
					tasks: [
						{
							status: 'NOT_DONE',
						},
					],
				},
			],
		};

		const result = whereFilter(condition)(data);

		assert.isTrue(result);
	});

	it('still works with legacy implicit scalar some matching (matches)', function() {
		const condition = {
			lines: 'good',
		};
		const data = {
			lines: ['bad', 'good'],
		};

		const result = whereFilter(condition)(data);

		assert.isTrue(result);
	});

	it('still works with legacy implicit scalar some matching (no match)', function() {
		const condition = {
			lines: 'good',
		};
		const data = {
			lines: ['bad', 'purple'],
		};

		const result = whereFilter(condition)(data);

		assert.isFalse(result);
	});

	it('matches values in data array', () => {
		const data = {colors: ['red', 'white']};

		// when value present
		assert.isTrue(whereFilter({colors: 'red'})(data)); // matched red
		assert.isTrue(whereFilter({colors: {eq: 'red'}})(data)); // matched red
		assert.isTrue(whereFilter({colors: {neq: 'red'}})(data)); // matched white

		// when value not present
		assert.isFalse(whereFilter({colors: 'green'})(data)); // no green
		assert.isTrue(whereFilter({colors: {neq: 'green'}})(data)); // matched red,white
		assert.isTrue(whereFilter({or: [{colors: {neq: 'red'}}, {colors: {neq: 'white'}}]})(data)); // matched white

		// NOTE: the below does not fail because all conditions pass, matched by (a different) data element
		// This is a weird edge case, unclear how to resolve, because the conditions can be totally independent.
		assert.isTrue(whereFilter({and: [{colors: {neq: 'red'}}, {colors: {neq: 'white'}}]})(data));
	});

	describe('date handling', () => {
		const date = DateTime.local();
		const dateFixtures = [
			{createdAt: date.minus({days: 1}).toJSDate()},
			{createdAt: date.minus({seconds: 1}).toJSDate()},
			{createdAt: date.toJSDate()},
			{createdAt: date.plus({seconds: 1}).toJSDate()},
			{createdAt: date.plus({days: 1}).toJSDate()},
		];

		it('should compare equivalent dates correctly', () => {
			const result = whereFilter({createdAt: date.toJSDate()})({createdAt: date.toJSDate()});

			expect(result).to.be.true;
		});

		it('should filter "less than" dates correctly', () => {
			const result = dateFixtures.filter(whereFilter({createdAt: {lt: date.toJSDate()}}));
			expect(result).to.have.lengthOf(2);
		});

		it('should filter "less than or equal to" dates correctly', () => {
			const result = dateFixtures.filter(whereFilter({createdAt: {lte: date.toJSDate()}}));
			expect(result).to.have.lengthOf(3);
		});

		it('should filter "greater than" dates correctly', () => {
			const result = dateFixtures.filter(whereFilter({createdAt: {gt: date.toJSDate()}}));
			expect(result).to.have.lengthOf(2);
		});

		it('should filter "greater than or equal to" dates correctly', () => {
			const result = dateFixtures.filter(whereFilter({createdAt: {gte: date.toJSDate()}}));
			expect(result).to.have.lengthOf(3);
		});
	});
});
