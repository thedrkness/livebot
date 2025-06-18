import { ApiClient } from "@twurple/api";
import { authProvider } from "./authProvider.js";
export const apiClient = new ApiClient({ authProvider });
const getVideos = async () => {
  const { data } = await apiClient.videos.getVideosByUser("191965237", {
    orderBy: "time",
    period: "day",
  });

  data.forEach((video) => {
    console.log(video.streamId);
  });
};

getVideos();
