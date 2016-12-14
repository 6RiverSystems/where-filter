import {whereFilter} from '../where-filter';
import chai from 'chai';

chai.should();

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
		let result = array.filter(whereFilter({symbol: 'IBM'}));

		result.length.should.be.equal(2);
	});

	it('should handle OR queries', () => {
		let result = array.filter(whereFilter({or: [{symbol: 'IBM'}, {symbol: 'AAPL'}]}));

		result.length.should.be.equal(3);
	});

	it('should handle AND queries', () => {
		let result = array.filter(whereFilter({and: [{symbol: 'IBM'}, {qty: {lt: '50'}}]}));

		result.length.should.be.equal(1);
	});

});
