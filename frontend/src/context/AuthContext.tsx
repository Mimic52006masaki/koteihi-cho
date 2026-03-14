import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/client";

type User = {
  id: number;
  name: string;
};

type AuthContextType = {
  user: User | null;
  setUser: (user: User | null) => void;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type Props = {
  children: React.ReactNode;
};

export const AuthProvider = ({ children }: Props) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await api.get("/auth/me.php");

        if (res.data.success) {
          setUser(res.data.user);
        } else {
          setUser(null)          
        }
      } catch (e) {
        console.error(e)
        setUser(null)
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthProvider内で使ってください");
  return context;
};
