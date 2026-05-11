fetch("movies.json")
  .then(response => response.json())
  .then(data => {
    const container = document.getElementById("movies");

    data.forEach(item => {
      const card = document.createElement("div");

      card.innerHTML = `
        <div style="margin:20px;padding:10px;border:1px solid #444;border-radius:10px;">
          <img src="${item.poster}" width="200">
          <h2>${item.title}</h2>
          <p>${item.description}</p>
          <p>⭐ ${item.rating}</p>
          <iframe 
            src="${item.embed}" 
            width="100%" 
            height="400"
            allowfullscreen>
          </iframe>
        </div>
      `;

      container.appendChild(card);
    });
  });
