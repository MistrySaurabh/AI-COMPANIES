import axios from 'axios';
import { PersonalInfo } from '../types/personalInfo';

const BASE = '/api/personal-info';

export const fetchPersonalInfo = () =>
  axios.get<PersonalInfo>(BASE).then((r) => r.data);

export const savePersonalInfo = (data: PersonalInfo) =>
  axios.put<PersonalInfo>(BASE, data).then((r) => r.data);
