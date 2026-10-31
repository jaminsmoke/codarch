import Marco from "../Marco";
import Home from "../react-pages/Home";

export default function ReactSite({ lang = "es" }: { lang?: string }) {
  return (
    <Marco lang={lang}>
      <Home lang={lang} />
    </Marco>
  );
}
