import React from 'react';

const UserContext = React.createContext({user: undefined, authenticate: undefined, handleLogout: undefined});

export default UserContext;
