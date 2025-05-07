import React, { useState, useEffect } from "react";
import { Storage } from "aws-amplify";

export default function VideoManager() {
  const [videos, setVideos] = useState([]);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);

  // Load list of videos (assumes all videos are in the root of your S3 bucket)
  const fetchVideos = async () => {
    try {
      const result = await Storage.list(""); // List all files in the bucket
      setVideos(result.results || result); // Amplify V6 vs V5 compatibility
    } catch (err) {
      alert("Error listing videos: " + err.message);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  // Play video
  const handlePlay = async (key) => {
    try {
      const url = await Storage.get(key);
      setSelectedVideoUrl(url);
    } catch (err) {
      alert("Failed to load video: " + err.message);
    }
  };

  // Delete video
  const handleDelete = async (key) => {
    if (!window.confirm("Are you sure you want to delete this video?")) return;
    try {
      await Storage.remove(key);
      fetchVideos();
      if (selectedVideoUrl) setSelectedVideoUrl(null);
    } catch (err) {
      alert("Failed to delete video: " + err.message);
    }
  };

  // Upload video
  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      await Storage.put(file.name, file, { contentType: file.type });
      setFile(null);
      fetchVideos();
      alert("Video uploaded!");
    } catch (err) {
      alert("Upload failed: " + err.message);
    }
    setUploading(false);
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Upload a Video</h2>
      <input
        type="file"
        accept="video/*"
        onChange={(e) => setFile(e.target.files[0])}
      />
      <button onClick={handleUpload} disabled={!file || uploading}>
        {uploading ? "Uploading..." : "Upload Video"}
      </button>

      <h2>Your Videos</h2>
      <ul>
        {videos.map((video) => (
          <li key={video.key}>
            {video.key}{" "}
            <button onClick={() => handlePlay(video.key)}>Play</button>{" "}
            <button onClick={() => handleDelete(video.key)}>Delete</button>
          </li>
        ))}
      </ul>

      {selectedVideoUrl && (
        <div>
          <h3>Preview</h3>
          <video src={selectedVideoUrl} controls width={400} />
        </div>
      )}
    </div>
  );
}