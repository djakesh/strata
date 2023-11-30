const servicesContainer = document.querySelector(".services__inner");
const publicationsContainer = document.querySelector(".publications__list");
const teamContainer = document.querySelector(".our-team__members");
const editServiceForm = document.querySelector("#edit-service-form");
const newTitle = document.querySelector("#new-title");
const newDescription = document.querySelector("#new-description");
const buttonEditArticle = document.querySelector("#button--edit-article");
const addServiceForm = document.querySelector("#add-service-form");
const buttonAddArticle = document.querySelector("#button--add-article");
const titleInput = document.querySelector("#title");
const descriptionInput = document.querySelector("#description");
const linkInput = document.querySelector("#link");
const addPublicationForm = document.querySelector("#add-publication-form");
const buttonAddPublication = document.querySelector("#button--add-publication");
const publicationInput = document.querySelector("#publication");
const editMemberForm = document.querySelector("#edit-member-form");
const newName = document.querySelector("#new-name");
const newPosition = document.querySelector("#new-position");
const newBio = document.querySelector("#new-bio");
const newPhotoLink = document.querySelector("#new-photo-link");
const buttonEditMember = document.querySelector("#button--edit-member");
const addMemberForm = document.querySelector("#add-member-form");
const buttonAddMember = document.querySelector("#button--add-member");
const nameInput = document.querySelector("#name");
const positionInput = document.querySelector("#position");
const bioInput = document.querySelector("#bio")
const photoLinkInput = document.querySelector("#photo-link");

// Функции для работы с API
function fetchApi(url, method, params) {
  return fetch(url, {
    method: method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });
}

function fetchDelete(objectId) {
  fetchApi("/landing/delete", "POST", { id: objectId })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Ошибка удаления");
      }
    })
    .catch((error) => console.error("Ошибка:", error));
}

function fetchDeleteMember(objectId) {
  fetchApi("/delete/"+objectId, "DELETE", { id: objectId })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Ошибка удаления");
      }
    })
    .catch((error) => console.error("Ошибка:", error));
}

function fetchEdit(params) {
  fetchApi("/landing/edit", "POST", params)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Ошибка редактирования");
      }
    })
    .catch((error) => console.error("Ошибка:", error));
}

function fetchAdd(params) {
  fetchApi("/landing/add", "POST", params)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Ошибка добавления");
      }
    })
    .catch((error) => console.error("Ошибка:", error));
}

// Основная логика обработки данных с сервера
fetch("/landing/get-elements")
  .then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json();
  })
  .then((html) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    processArticles(doc);
    processPublications(doc);

  })
  .catch((error) => console.error("Ошибка:", error));

fetch("/landing/get-members")
  .then((response) => response.json())
  .then((members) => {
    processTeamMembers(members);
  })
  .catch((error) => console.error(error));

function processArticles(doc) {
  const articles = doc.querySelectorAll(".service");
  articles.forEach((article) => {
    const articleText = article.querySelector(".service__text");
    const deleteButton = createButton("delete", "button--delete-article");
    const editButton = createButton("edit", "button--edit-article");

    if (articleText) {
      articleText.append(editButton, deleteButton);
    }
    servicesContainer.appendChild(article);
  });
}

function processPublications(doc) {
  const publications = doc.querySelectorAll(".publications__item");
  publications.forEach((publication) => {
    if (
      !publication.classList.contains("publications__list-header") &&
      !publication.classList.contains("ellipses")
    ) {
      const deleteButton = createButton("delete", "button--delete-publication");
      publication.append(deleteButton);
      publicationsContainer.appendChild(publication);
    }
  });
}

function processTeamMembers(members) {
  members.forEach((member) => {
    const memberArticle = document.createElement("article")
    const image = document.createElement("img")
    const name = document.createElement("h3")
    const position = document.createElement("p")
    const description = document.createElement("p")

    memberArticle.className = "our-team__member"
    position.className = "our-team__member-position"
    description.className = "our-team__member-bio"

    image.src = member.photo
    name.innerHTML = member.name
    position.innerHTML = member.position
    description.innerHTML = member.description
    memberArticle.id = member.id

    const deleteButton = createButton("delete", "button--delete-member");
    const editButton = createButton("edit", "button--edit-member");

    memberArticle.append(image,name,position,description,editButton,deleteButton)
    // member.append(editButton, deleteButton);
    teamContainer.appendChild(memberArticle);
  });
}

function createButton(text, className) {
  const button = document.createElement("button");
  button.textContent = text;
  button.className = className;
  return button;
}

// Обработчики событий
document.addEventListener("click", (e) => {
  if (e.target.className == "button--delete-article") {
    let id = e.target.closest(".service").id;
    fetchDelete(id);
    location.reload();
  }

  if (e.target.className == "button--edit-article") {
    editServiceForm.classList.remove("hidden");
    let articleElement = e.target.closest(".service__text");
    newTitle.value = articleElement.querySelector("h3").innerHTML;
    newDescription.value = articleElement.querySelector("p").innerHTML;

    let id = e.target.closest(".service").id;

    buttonEditArticle.addEventListener("click", () => {
      let params = {
        id: id,
        newTitle: newTitle.value,
        newDescription: newDescription.value,
        type: "services",
      };
      fetchEdit(params);
    });
  }

  if (e.target.className == "button--new-service") {
    addServiceForm.classList.remove("hidden");

    buttonAddArticle.addEventListener("click", () => {
      let params = {
        title: titleInput.value,
        description: descriptionInput.value,
        imageUrl: linkInput.value,
        type: "services",
      };
      fetchAdd(params);
    });
  }

  if (e.target.className == "close-form") {
    e.target.closest(".mark-form").classList.add("hidden");
  }

  if (e.target.className == "button--delete-publication") {
    let id = e.target.closest(".publications__item").id;
    fetchDelete(id);
    location.reload();
  }

  if (e.target.className == "button--new-publication") {
    addPublicationForm.classList.remove("hidden");
    buttonAddPublication.addEventListener("click", () => {
      let params = { text: publicationInput.value, type: "publications" };
      fetchAdd(params);
    });
  }

  if (e.target.className == "button--delete-member") {
    let id = e.target.closest(".our-team__member").id;
    fetchDeleteMember(id);
    console.log(id)
  }

  if (e.target.className == "button--edit-member") {
    editMemberForm.classList.remove("hidden");
    let memberElement = e.target.closest(".our-team__member");
    newName.value = memberElement.querySelector("h3").innerHTML;
    newPosition.value = memberElement.querySelector(".our-team__member-position").innerHTML;
    newBio.value = memberElement.querySelector(".our-team__member-bio").innerHTML
    newPhotoLink.value = memberElement.querySelector("img").src
    let id = memberElement.id;

    buttonEditMember.addEventListener("click", () => {
      let params = {
        id: id,
        name: newName.value,
        position: newPosition.value,
        description: newBio.value,
        photo: newPhotoLink.value,
        type: "members",
      };
      fetchEdit(params);
      
      location.reload();
    });
  }

  if (e.target.className == "button--add-member") {
    addMemberForm.classList.remove("hidden");
    buttonAddMember.addEventListener("click", () => {
      let params = {
        name: nameInput.value,
        position: positionInput.value,
        description: bioInput.value,
        photoLink: photoLinkInput.value,
        type: "members",
      };

      fetchAdd(params);
    });
  }
});
