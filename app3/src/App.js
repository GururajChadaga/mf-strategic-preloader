import LocalButton from './Widget';
import React from 'react';
import _ from 'lodash';

const App = () => {
  // Using different lodash functions
  const users = [
    { name: 'John', age: 30 },
    { name: 'Jane', age: 25 },
    { name: 'Bob', age: 35 }
  ];

  const sortedUsers = _.sortBy(users, 'age');
  const names = _.map(users, 'name');
  const avgAge = _.meanBy(users, 'age');

  return (
    <div>
      <h1>Dynamic System Host</h1>
      <h2>App 3</h2>
      <div>
        <p>Users sorted by age: {sortedUsers.map(u => `${u.name}(${u.age})`).join(', ')}</p>
        <p>Names with lodash map: {names.join(', ')}</p>
        <p>Average age with lodash: {avgAge.toFixed(1)}</p>
      </div>
      <LocalButton />
    </div>
  );
};

export default App;
