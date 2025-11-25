import LocalButton from './Widget';
import React from 'react';
import _ from 'lodash';

const App = () => {
  // Using lodash functions
  const numbers = [1, 2, 3, 4, 5];
  const doubled = _.map(numbers, n => n * 2);
  const sum = _.sum(numbers);

  return (
    <div>
      <h1>Dynamic System Host</h1>
      <h2>App 2</h2>
      <div>
        <p>Original numbers: {numbers.join(', ')}</p>
        <p>Doubled with lodash map: {doubled.join(', ')}</p>
        <p>Sum with lodash: {sum}</p>
      </div>
      <LocalButton />
    </div>
  );
};

export default App;
