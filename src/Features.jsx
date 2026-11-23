const features = [
  { title: "Secure Voting", text: "Every vote is protected and verified." },
  { title: "Easy to Use", text: "Cast your vote in just a few clicks." },
  { title: "Transparent", text: "Results are clear and trustworthy." },
]

export default function Features() {
  return (
    <section id="features" className="features">
      <h2>Features</h2>
      <div className="cards">
        {features.map((f) => (
          <div className="card" key={f.title}>
            <h3>{f.title}</h3>
            <p>{f.text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}