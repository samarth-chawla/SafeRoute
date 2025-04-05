import { useState } from 'react';
import { AlertTriangle, AlertCircle, Shield } from 'lucide-react';

export const ReportForm = ({ onSubmit }) => {
  const [category, setCategory] = useState('safe');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!location) return;

    onSubmit({
      category,
      description,
      location,
      timestamp: new Date().toISOString(),
    });

    setDescription('');
  };

  const getCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation([position.coords.latitude, position.coords.longitude]);
      },
      (error) => {
        console.error('Error getting location:', error);
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white rounded-lg shadow">
      <div>
        <label className="block text-sm font-medium text-gray-700">Category</label>
        <div className="mt-1 flex gap-4">
          <button
            type="button"
            onClick={() => setCategory('safe')}
            className={`flex items-center gap-2 px-4 py-2 rounded ${
              category === 'safe' ? 'bg-green-100 text-green-800' : 'bg-gray-100'
            }`}
          >
            <Shield size={20} />
            Safe
          </button>
          <button
            type="button"
            onClick={() => setCategory('caution')}
            className={`flex items-center gap-2 px-4 py-2 rounded ${
              category === 'caution' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100'
            }`}
          >
            <AlertCircle size={20} />
            Caution
          </button>
          <button
            type="button"
            onClick={() => setCategory('danger')}
            className={`flex items-center gap-2 px-4 py-2 rounded ${
              category === 'danger' ? 'bg-red-100 text-red-800' : 'bg-gray-100'
            }`}
          >
            <AlertTriangle size={20} />
            Danger
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          rows={3}
          required
        />
      </div>

      <div>
        <button
          type="button"
          onClick={getCurrentLocation}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Use Current Location
        </button>
        {location && (
          <p className="mt-2 text-sm text-gray-500">
            Location set: {location[0].toFixed(4)}, {location[1].toFixed(4)}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={!location}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
      >
        Submit Report
      </button>
    </form>
  );
};