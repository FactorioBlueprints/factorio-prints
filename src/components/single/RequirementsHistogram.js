import React             from 'react';
import PropTypes         from 'prop-types';
import entitiesWithIcons from '../../data/entitiesWithIcons';

import {
	faCalendar,
	faClock,
	faCodeBranch,
	faCog,
	faHeart,
	faLink,
	faToggleOff,
	faToggleOn,
	faUser,
}                             from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}      from '@fortawesome/react-fontawesome';
import {forbidExtraProps}     from 'airbnb-prop-types';
import concat                 from 'lodash/concat';
import flatMap                from 'lodash/flatMap';
import forOwn                 from 'lodash/forOwn';
import countBy                from 'lodash/fp/countBy';
import flow                   from 'lodash/fp/flow';
import reverse                from 'lodash/fp/reverse';
import sortBy                 from 'lodash/fp/sortBy';
import toPairs                from 'lodash/fp/toPairs';
import get                    from 'lodash/get';
import has                    from 'lodash/has';
import isEmpty                from 'lodash/isEmpty';
import isEqual                from 'lodash/isEqual';
import marked                 from 'marked';
import moment                 from 'moment';
import Badge                  from 'react-bootstrap/Badge';
import Button                 from 'react-bootstrap/Button';
import Card                   from 'react-bootstrap/Card';
import Col                    from 'react-bootstrap/Col';
import Container                               from 'react-bootstrap/Container';
import Image                                   from 'react-bootstrap/Image';
import Jumbotron                               from 'react-bootstrap/Jumbotron';
import Row                                     from 'react-bootstrap/Row';
import Table                                   from 'react-bootstrap/Table';
import DocumentTitle                           from 'react-document-title';
import {connect}                               from 'react-redux';
import {Link}                                  from 'react-router-dom';
import {bindActionCreators}                    from 'redux';
import {useMutation, useQuery, useQueryClient} from 'react-query';
import axios                                   from 'axios';
import ItemHistogram                           from './ItemHistogram';

RequirementsHistogram.propTypes = {
	blueprintKey: PropTypes.string.isRequired,
};

function RequirementsHistogram(props)
{
	const {blueprintKey} = props;

	const queryKey                              = ['blueprintItems', blueprintKey];
	const {isSuccess, isLoading, isError, data} = useQuery(
		queryKey,
		() => axios.get(`${process.env.REACT_APP_REST_URL}/api/blueprintItems/${blueprintKey}`),
	);

	if (!isSuccess) return <></>;

	console.log({data});

	const {entities, items, recipes} = data.data;

	return (
		<>
			<ItemHistogram title='Entities' items={entities} />
			<ItemHistogram title='Items' items={items} />
			<ItemHistogram title='Recipes' items={recipes} />
		</>
	);
}

export default RequirementsHistogram;
