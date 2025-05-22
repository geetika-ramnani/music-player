import React, { useState } from "react";
import { Upload, Music, Image } from "lucide-react";

function UserSongRequest() {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!audioFile) {
    setError("Please select an audio file");
    setMessage("");
    return;
  }

  try {
    setLoading(true);
    setError("");
    setMessage("");

    const formData = new FormData();
    formData.append("title", title);
    formData.append("artist", artist);
    formData.append("uploadedBy", "User"); // Or get from auth if available
    formData.append("audio", audioFile);
    if (imageFile) formData.append("image", imageFile);

    const res = await fetch("https://music-player-a8lg.onrender.com/api/song-requests", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      // First try to get the error message from response
      const errorText = await res.text();
      try {
        // If the response is JSON, parse it
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error || errorData.message || 'Failed to send request');
      } catch {
        // If not JSON, use the raw text
        throw new Error(errorText || 'Failed to send request');
      }
    }

    const data = await res.json();
    setMessage("Your song request has been sent successfully!");
    setTitle("");
    setArtist("");
    setAudioFile(null);
    setImageFile(null);
    setImagePreview(null);
    setError("");
  } catch (err: any) {
    setError(err.message || "Failed to send request");
    setMessage("");
  } finally {
    setLoading(false);
  }
};

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith("audio/")) {
    setError("Invalid audio file type");
    e.target.value = "";
    return;
  }

  // Add size validation (10MB)
  if (file.size > 10 * 1024 * 1024) {
    setError("Audio file too large (max 10MB)");
    e.target.value = "";
    return;
  }

  setAudioFile(file);
  setError("");
};
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
      setError("");
    } else {
      setError("Invalid image file");
      e.target.value = "";
      setImageFile(null);
      setImagePreview(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
      <div className="flex items-center space-x-2 mb-6">
        <Upload className="w-6 h-6 text-blue-500" />
        <h2 className="text-2xl font-bold">Request Song Upload</h2>
      </div>

      {/* {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>
      )} */}
      {/* In your component's error display: */}
    {error && (
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        <strong>Error:</strong> {error}
        {error.includes('large') && (
        <p className="mt-1 text-sm">Maximum file size is 10MB</p>
        )}
    </div>
    )}
      {message && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">{message}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label
            className="block text-gray-700 text-sm font-bold mb-2"
            htmlFor="title"
          >
            Song Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200"
          />
        </div>

        <div className="mb-4">
          <label
            className="block text-gray-700 text-sm font-bold mb-2"
            htmlFor="artist"
          >
            Artist
          </label>
          <input
            type="text"
            id="artist"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            required
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200"
          />
        </div>

        <div className="mb-4">
          <label
            className="block text-gray-700 text-sm font-bold mb-2"
            htmlFor="audio"
          >
            Audio File
          </label>
          <div className="flex items-center justify-center w-full">
            <label className="w-full flex flex-col items-center px-4 py-6 bg-white rounded-lg shadow-lg tracking-wide border border-blue-500 cursor-pointer hover:bg-blue-500 hover:text-white">
              <Music className="w-8 h-8" />
              <span className="mt-2 text-base">
                {audioFile ? audioFile.name : "Select audio file"}
              </span>
              <input
                type="file"
                id="audio"
                className="hidden"
                accept="audio/*"
                onChange={handleAudioChange}
                required
                disabled={loading}
              />
            </label>
          </div>
        </div>

        <div className="mb-6">
          <label
            className="block text-gray-700 text-sm font-bold mb-2"
            htmlFor="image"
          >
            Cover Image (Optional)
          </label>
          <div className="flex items-center justify-center w-full">
            <label className="w-full flex flex-col items-center px-4 py-6 bg-white rounded-lg shadow-lg tracking-wide border border-blue-500 cursor-pointer hover:bg-blue-500 hover:text-white">
              <Image className="w-8 h-8" />
              <span className="mt-2 text-base">
                {imageFile ? imageFile.name : "Select cover image"}
              </span>
              <input
                type="file"
                id="image"
                className="hidden"
                accept="image/*"
                onChange={handleImageChange}
                disabled={loading}
              />
            </label>
          </div>
          {imagePreview && (
            <div className="mt-4">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-32 h-32 object-cover rounded-lg"
                loading="lazy"
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Submitting..." : "Submit Request"}
        </button>
      </form>
    </div>
  );
}

export default UserSongRequest;
