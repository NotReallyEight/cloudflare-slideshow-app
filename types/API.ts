export type ListFilesResponse = {
  status: number;
  files: {
    key: string;
    publicUrl: string;
  }[];
};
