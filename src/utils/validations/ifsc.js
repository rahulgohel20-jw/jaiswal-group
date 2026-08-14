export const lookupIFSC = async (ifscCode) => {
  const code = ifscCode.trim().toUpperCase();
  try {
    const res = await fetch(`https://ifsc.razorpay.com/${code}`);
    if (!res.ok) return null; // 404 = not a real IFSC code
    const data = await res.json();
    return {
      bank: data.BANK,
      branch: data.BRANCH,
      city: data.CITY,
      state: data.STATE,
      address: data.ADDRESS,
    };
  } catch {
    return null; // network error — don't block the user, just skip enrichment
  }
};