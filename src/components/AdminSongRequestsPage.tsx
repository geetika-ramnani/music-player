import React, { useEffect, useState } from "react";

interface Request {
  _id: string;
  title: string;
  artist: string;
  coverUrl: string;
  audioUrl: string;
  uploadedBy: string;
}

interface Props {
  token: string;
}

const AdminSongRequestsPage: React.FC<Props> = ({ token }) => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [error, setError] = useState("");
  const [loadingIds, setLoadingIds] = useState<string[]>([]); // track loading for each request

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setError("");
        const res = await fetch("https://music-player-a8lg.onrender.com/api/song-requests", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("Failed to fetch song requests");
        }

        const data = await res.json();
        setRequests(data.requests);
      } catch (err: any) {
        setError(err.message || "Error fetching requests");
      }
    };

    fetchRequests();
  }, [token]);

  const handleAccept = async (id: string) => {
    setLoadingIds((prev) => [...prev, id]);
    try {
      setError("");
      const res = await fetch(`https://music-player-a8lg.onrender.com/api/song-requests/${id}/accept`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to accept request");
      }

      setRequests((prev) => prev.filter((r) => r._id !== id));
    } catch (err: any) {
      setError(err.message || "Failed to accept request");
    } finally {
      setLoadingIds((prev) => prev.filter((loadingId) => loadingId !== id));
    }
  };

  const handleDecline = async (id: string) => {
    setLoadingIds((prev) => [...prev, id]);
    try {
      setError("");
      const res = await fetch(`https://music-player-a8lg.onrender.com/api/song-requests/${id}/decline`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to decline request");
      }

      setRequests((prev) => prev.filter((r) => r._id !== id));
    } catch (err: any) {
      setError(err.message || "Failed to decline request");
    } finally {
      setLoadingIds((prev) => prev.filter((loadingId) => loadingId !== id));
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-md max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-rose-600">Pending Song Requests</h2>

      {error && (
        <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4">{error}</div>
      )}

      {requests.length === 0 ? (
        <p className="text-gray-600">No pending requests.</p>
      ) : (
        <ul className="space-y-4">
          {requests.map((req) => {
            const isLoading = loadingIds.includes(req._id);
            return (
              <li key={req._id} className="border border-gray-300 p-4 rounded-md shadow-sm">
                <h3 className="text-lg font-semibold">{req.title}</h3>
                <p className="text-sm text-gray-600">Artist: {req.artist}</p>
                {req.coverUrl && (
                  <img
                    src={req.coverUrl}
                    alt="cover"
                    className="w-24 h-24 object-cover rounded mt-2"
                    loading="lazy"
                  />
                )}
                <audio controls className="mt-2 w-full">
                  <source src={req.audioUrl} type="audio/mpeg" />
                  Your browser does not support the audio tag.
                </audio>
                <div className="flex space-x-2 mt-4">
                  <button
                    onClick={() => handleAccept(req._id)}
                    disabled={isLoading}
                    className={`text-white px-4 py-2 rounded ${
                      isLoading ? "bg-green-300 cursor-not-allowed" : "bg-green-500 hover:bg-green-600"
                    }`}
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleDecline(req._id)}
                    disabled={isLoading}
                    className={`text-white px-4 py-2 rounded ${
                      isLoading ? "bg-red-300 cursor-not-allowed" : "bg-red-500 hover:bg-red-600"
                    }`}
                  >
                    Decline
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default AdminSongRequestsPage;
