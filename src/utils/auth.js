  export const getUserIdFromToken = () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return null;

      const payload = JSON.parse(atob(token.split(".")[1]));

      return payload.userId ?? payload.id ?? payload.sub ?? null;
    } catch (err) {
      console.error(err);
      return null;
    }
  };