// import "./index.css";
// import Home from "./Home";
// import StartTherapyModal from "./components/SpeechSession";
// import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// function App() {
//   return (
//     <Router>
//       <Routes>
//         <Route path="/" element={<Home />} />
//         <Route path="/speech-session" element={<StartTherapyModal />} />
//       </Routes>
//     </Router>
//   );
// }

// export default App;
import "./index.css";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
// import StartTherapyModal from "./components/SpeechSession";
import Progress from "./pages/Progress";
import ExerciseRunner from "./pages/ExerciseRunner";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { useEffect } from "react";
import axios from "axios";
import Physiotherapy from "./pages/Physiotherapy";
import PhysioProgress from "./pages/PhysioProgress";

function App() {
  const { user, isAuthenticated, isLoading, getIdTokenClaims } = useAuth0();

  useEffect(() => {
    const syncUser = async () => {
      if (!user) return;

      const token = await getIdTokenClaims();

      await axios.post(
        "http://127.0.0.1:8000/users/sync",
        {
          auth0_id: user.sub,
          username: user.name,
          email: user.email
        },
        {
          headers: {
            Authorization: `Bearer ${token.__raw}`
          }
        }
      );
    };

    if (isAuthenticated) syncUser();
  }, [isAuthenticated, user]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        {/* <Route path="/speech-session" element={<SpeechSession />} /> */}
        <Route path="/progress" element={<Progress />} />
        <Route path="/exercise/:id" element={<ExerciseRunner />} />
        <Route path="physiotherapy" element={<Physiotherapy />} />
        <Route path="/physio-progress" element={<PhysioProgress />} />


      </Routes>
    </Router>
  );
}

export default App;


