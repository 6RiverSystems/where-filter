# where-filter

Effectively a fork of [loopback-filters](https://github.com/strongloop/loopback-filters)

Works according to [Loopback Where Criteria spec](https://loopback.io/doc/en/lb3/Where-filter.html). With the additional support for array predicates some and all.

## some

```javascript
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

console.log(result);
// true
```

## all

```javascript
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

console.log(result);
// true
```
