
let allMovies = [];

fetch("movies.json")
.then(res => res.json())
.then(data => {
  allMovies = data;
  renderMovies(data);
});

function renderMovies(data){
  const moviesDiv = document.getElementById("movies");
  moviesDiv.innerHTML = "";

  data.forEach(item => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <img src="${item.poster}" alt="${item.title}">
      <div class="card-content">
        <h3>${item.title}</h3>
        <p>⭐ ${item.rating}</p>
        <small>${item.year}</small>
      </div>
    `;

    card.onclick = () => openMovie(item);

    moviesDiv.appendChild(card);
  });
}

function openMovie(item){
  const modal = document.getElementById("modal");
  const body = document.getElementById("modal-body");

  body.innerHTML = `
    <h2>${item.title}</h2>
    <p>${item.description}</p>
    <iframe src="${item.embed}" allowfullscreen></iframe>
  `;

  modal.classList.remove("hidden");
}

document.getElementById("close").onclick = () => {
  document.getElementById("modal").classList.add("hidden");
};

document.getElementById("search").addEventListener("input", e => {
  const value = e.target.value.toLowerCase();

  const filtered = allMovies.filter(m =>
    m.title.toLowerCase().includes(value)
  );

  renderMovies(filtered);
});
