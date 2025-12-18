// hooks/useTranslationRecords.js
import { useEffect, useState } from "react";

export const translationRecords = (TRANSLATION_API_BASE_URL) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTranslationRecords = async () => {
    try {
      setLoading(true);
      setError(null);

      const authToken = localStorage.getItem("authToken");

      const response = await fetch(
        `${TRANSLATION_API_BASE_URL}/translation-records/`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error("Failed to fetch translation records");
      }

      setRecords(Array.isArray(data.records) ? data.records : []);
    } catch (err) {
      setError(err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTranslationRecords();
  }, []);

  return {
    records,
    loading,
    error,
    refetch: fetchTranslationRecords,
  };
};
