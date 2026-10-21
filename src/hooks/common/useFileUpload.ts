"use client";

import { useCallback, useState } from "react";
import { apiClient } from "@/lib/axios/client";

export function useFileUpload(uploadUrl: string) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File) => {
      setIsUploading(true);
      setError(null);
      setProgress(0);

      const formData = new FormData();
      formData.append("file", file);

      try {
        const { data } = await apiClient.post(uploadUrl, formData, {
          onUploadProgress: (event) => {
            if (event.total) {
              setProgress(Math.round((event.loaded / event.total) * 100));
            }
          },
        });
        return data;
      } catch {
        setError("Upload failed");
        throw new Error("Upload failed");
      } finally {
        setIsUploading(false);
      }
    },
    [uploadUrl],
  );

  return { upload, isUploading, progress, error };
}
