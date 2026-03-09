import axios from "axios";

const CONTROLPLANE_BASE = "http://api.bytelake.slabs.pt";

async function retry(fn, attempts = 3, delay = 500){
  let lastError;

  for (let i = 0; i < attempts; i++){
    try{
      return await fn();
    }catch(err){
      lastError = err;

      if(i < attempts - 1){
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  throw lastError;
}

async function createMultipartUpload(lakeId, partSize, maxTime, file, authorization){
  const res = await axios.post(`${CONTROLPLANE_BASE}/createMultipart`, {
    name: file.name,
    lakeId,
    fileSize: file.size,
    partSize,
    maxTime
  },{
    headers:{
      Authorization: `Bearer ${authorization}`
    }
  });

  return res.data;
}

async function uploadPart(multipartId, partNumber, blob, token){
  const form = new FormData();
  form.append("file", blob, `part-${partNumber}`);

  const res = await axios.post(
    `${CONTROLPLANE_BASE}/uploadPart?multipartId=${multipartId}&partNumber=${partNumber}`,
    form,
    {
      headers:{
        Authorization:`Bearer ${token}`
      }
    }
  );

  return res.data;
}

async function completeMultipart(multipartId, authorization){
  const res = await axios.post(
    `${CONTROLPLANE_BASE}/completeMultipart?multipartId=${multipartId}`,
    {},
    {
      headers:{
        Authorization:`Bearer ${authorization}`
      }
    }
  );

  return res.data;
}

export async function multipartUpload({lakeId, file, authorization, options = {}, onProgress}){
  const partSize = options.partSize || 8 * 1024 * 1024;
  const maxTime = options.maxTime || 3600;
  const retries = options.retries || 3;

  const { multipartId, partsUploadSignedToken } = await createMultipartUpload(lakeId, partSize, maxTime, file, authorization);

  const totalParts = Math.ceil(file.size / partSize);

  let uploadedParts = 0;

  for(let partNumber = 1; partNumber <= totalParts; partNumber++){

    const start = (partNumber - 1) * partSize;
    const end = Math.min(start + partSize, file.size);

    const blobPart = file.slice(start, end);

    await retry(() =>
      uploadPart(
        multipartId,
        partNumber,
        blobPart,
        partsUploadSignedToken
      ),
      retries
    );

    uploadedParts++;

    if(onProgress){
      onProgress({
        uploadedParts,
        totalParts,
        progress: uploadedParts / totalParts,
        percent: Math.round((uploadedParts / totalParts) * 100)
      });
    }
  }

  return await completeMultipart(multipartId, authorization);
}