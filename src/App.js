import React, { useState, useEffect } from "react";
import { Amplify } from "aws-amplify";
import awsExports from "./aws-exports";
import { Authenticator } from "@aws-amplify/ui-react";
import {
  list,
  uploadData,
  getUrl,
  remove,
} from "aws-amplify/storage";
import "@aws-amplify/ui-react/styles.css";

Amplify.configure(awsExports);

function VideoUploader() {
  const [file, setFile] = useState(null);
  const [videos, setVideos] = useState([]);
  const [playingUrl, setPlayingUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch videos from S3 (sorted, filtered, uncached)
  const fetchVideos = async () => {
    try {
      setLoading(true);
      const { items } = await list({
        path: "",
        options: {
          accessLevel: "public",
          pageSize: 100, // force complete list
        },
      });

      const filtered = items
        .filter((item) => item && typeof item.key === "string")
        .sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0)); // newest first

      console.log("Fetched items:", filtered);
      setVideos(filtered);
    } catch (err) {
      alert("Failed to list videos: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  // Upload a file to S3
  const handleUpload = async () => {
    if (!file) {
      alert("Please select a video to upload.");
      return;
    }
    try {
      setLoading(true);
      await uploadData({
        key: file.name,
        data: file,
        options: { contentType: file.type, accessLevel: "public" }
      }).result;
      alert("Upload successful!");
      setFile(null);
      await fetchVideos();
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Play video by retrieving signed URL + timestamp (cache busting)
  const handlePlay = async (key) => {
    try {
      setLoading(true);
      const url = await getUrl({ key, options: { accessLevel: "public" } });
      setPlayingUrl(url.url + `?ts=${Date.now()}`);
    } catch (err) {
      alert("Failed to load video: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete a file from S3 and refresh list
  const handleDelete = async (key) => {
    if (!window.confirm(`Delete ${key}?`)) return;
    try {
      setLoading(true);
      await remove({ key, options: { accessLevel: "public" } });
      console.log("Deleted:", key);
      await fetchVideos(); // important: await here
      setPlayingUrl(null);
    } catch (err) {
      alert("Failed to delete: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Upload a Video</h2>
      <input
        type="file"
        accept="video/*"
        onChange={(e) => setFile(e.target.files[0])}
        disabled={loading}
      />
      <button onClick={handleUpload} disabled={loading || !file}>
        Upload Video
      </button>
      <h3>Your Videos</h3>
      {loading && <div>Loading...</div>}
      <ul>
        {videos.map((v) => (
          <li key={v.key} style={{ marginBottom: "1em" }}>
            <strong>{v.key.split("/").pop()}</strong><br />
            <button onClick={() => handlePlay(v.key)} disabled={loading}>
              Play
            </button>{" "}
            <button onClick={() => handleDelete(v.key)} disabled={loading}>
              Delete
            </button>
          </li>
        ))}
      </ul>
      {playingUrl && (
        <div>
          <video src={playingUrl} controls width="400" />
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <main style={{ padding: 30 }}>
          <h1>Hello, {user?.username}</h1>
          <button onClick={signOut}>Sign Out</button>
          <VideoUploader />
        </main>
      )}
    </Authenticator>
  );
}

export default App;
