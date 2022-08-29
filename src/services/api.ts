import axios from "axios";

const api = axios.create({
  baseURL: 'https://www.twitch.tv/helix'
})

export { api };
