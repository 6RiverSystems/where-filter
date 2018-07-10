import whereFilter from '../where-filter';
import {expect, should} from 'chai';
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
		];
	});

	it('should handle simple queries', () => {
		const result = array.filter(whereFilter({symbol: 'IBM'}));

		result.length.should.be.equal(2);
	});

	it('should handle OR queries', () => {
		const result = array.filter(whereFilter({or: [{symbol: 'IBM'}, {symbol: 'AAPL'}]}));

		result.length.should.be.equal(3);
	});

	it('should handle AND queries', () => {
		const result = array.filter(whereFilter({and: [{symbol: 'IBM'}, {qty: {lt: '50'}}]}));

		result.length.should.be.equal(1);
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
