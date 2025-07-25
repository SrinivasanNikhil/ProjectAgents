console.log('Debug test starting...');

describe('Debug Test', () => {
  console.log('Describe block executing...');

  it('should work', () => {
    console.log('Test executing...');
    expect(1 + 1).toBe(2);
    console.log('Test completed...');
  });
});

console.log('Debug test file loaded...');
