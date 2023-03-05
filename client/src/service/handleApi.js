import axios from 'axios'
import config from './headerToken';
import config_form from './header_form';

const getListTopic = async () => {
    return await axios.get("/topics",config());
  };
const getIdeas_by_topic= async id => {
    return await axios.get(`/topics/${id}`, config());
}
// const getIdeas_by_topic= async() => {
//     return await axios.get(`/topics/2`, config());
// }
const getIdeaDetail_by_idea = async id => {
        return await axios.get(`/ideas/${id}`, config());
}
const post_comment = data => {
    return axios.post("/comments", data, config());
  };
const login = data => {
    return axios.post("/accounts/login", data)
};
const create_idea= async (id, data) =>{
    return axios.post(`/topics/${id}/upload`, data, config_form());
}
const handleApi = {
    getListTopic,
    getIdeas_by_topic,
    getIdeaDetail_by_idea,
    post_comment, 
    login, 
    create_idea

};
export default handleApi