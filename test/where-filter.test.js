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
		const result = array.filter(whereFilter({symbol: 'IBM'}));

		result.length.should.be.equal(2);
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
