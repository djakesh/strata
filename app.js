const express = require("express");
const multer = require("multer");
const ejs = require("ejs");
const fs = require("fs").promises;
const bodyParser = require("body-parser");
const app = express();
const port = 3000;
const { v4: uuidv4 } = require("uuid");
const cors = require("cors");
const toGeoJSON = require("togeojson");
const { JSDOM } = require("jsdom");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const { DOMParser } = require("xmldom");
const JSZip = require("jszip");
const cheerio = require("cheerio");
const { minify } = require("html-minifier");

// Настройка EJS шаблонизатора
app.set("view engine", "ejs");
app.set("views", "views");

app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use(bodyParser.json());
app.use(cors());

// Маршрут для админ-панели
app.get("/admin-panel", (req, res) => {
  res.render("admin-panel");
});

app.get("/map-editor", (req, res) => {
  res.render("map-editor");
});

// Маршрут для обработки отправки формы
app.post("/admin-panel", async (req, res) => {
  const newTitle = req.body.newTitle;

  try {
    // Чтение и изменение заголовка в HTML файле
    let html = await fs.readFile("public/index.html", "utf-8");
    html = html.replace(/<title>(.*?)<\/title>/, `<title>${newTitle}</title>`);
    await fs.writeFile("public/index.html", html);

    res.redirect("/admin-panel");
  } catch (error) {
    console.error(error);
    res.status(500).send("Ошибка при изменении заголовка.");
  }
});

// Добавление меток
app.post("/map-editor", async (req, res) => {
  const geojsonFilePath = "marks.geojson";
  console.log(req.body);
  async function addDataToGeoJSONFile(req) {
    try {
      // Попытка чтения GeoJSON файла
      let geojsonData;
      try {
        const fileContent = await fs.readFile(geojsonFilePath, "utf8");
        geojsonData = JSON.parse(fileContent);
      } catch (error) {
        // Если файл не существует или не содержит данных JSON, создайте новый GeoJSON
        geojsonData = {
          type: "FeatureCollection",
          features: [],
        };
      }
      let newMark = req.body;
      newMark.properties.id = uuidv4();
      // Добавление новой фичи в массив фич
      geojsonData.features.push(newMark);

      // Преобразование обновленных данных в JSON формат
      const updatedData = JSON.stringify(geojsonData, null, 2);

      // Запись обновленных данных обратно в файл
      await fs.writeFile(geojsonFilePath, updatedData, "utf8");
      console.log("Объект успешно добавлен в GeoJSON файл.");
    } catch (error) {
      console.error("Ошибка при добавлении в GeoJSON файл:", error);
    }
  }
  addDataToGeoJSONFile(req);
});

// Удаление меток
app.post("/deleteMark", async (req, res) => {
  const { id } = req.body;
  try {
    // Асинхронное чтение geojson данных из файла
    let data = JSON.parse(await fs.readFile("marks.geojson", "utf8"));

    // Поиск индекса объекта с заданным id
    const index = data.features.findIndex(
      (feature) => feature.properties.id === id
    );

    if (index !== -1) {
      // Удаление объекта из массива
      data.features.splice(index, 1);

      // Асинхронное сохранение обновленных данных обратно в файл
      await fs.writeFile("marks.geojson", JSON.stringify(data, null, 4));

      res.status(200).send({ message: "Object deleted successfully." });
    } else {
      res.status(404).send({ message: "Object not found." });
    }
  } catch (error) {
    // Отправка ошибки, если что-то пошло не так
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
});

// Редактирование меток
app.post("/editMark", async (req, res) => {
  const id = req.body.id;
  const title = req.body.title;
  const description = req.body.description;
  try {
    // Чтение содержимого GeoJSON файла
    const geojsonContent = await fs.readFile("marks.geojson", "utf8");
    const geojsonData = JSON.parse(geojsonContent);

    // Поиск объекта по ID
    const objectToEdit = geojsonData.features.find(
      (feature) => feature.properties.id === id
    );

    if (objectToEdit) {
      // Обновление title и description объекта
      objectToEdit.properties.title = title;
      objectToEdit.properties.description = description;

      // Сохранение обновленного содержимого обратно в файл
      await fs.writeFile("marks.geojson", JSON.stringify(geojsonData, null, 4));

      res.status(200).send({ message: "GeoJSON object updated successfully." });
    } else {
      res
        .status(404)
        .send({ message: "GeoJSON object with given ID not found." });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
});

// Получение меток
app.get("/getMarks", (req, res) => {
  const geojsonFilePath = "marks.geojson";
  async function addDataToGeoJSONFile(req) {
    try {
      // Попытка чтения GeoJSON файла
      let geojsonData;
      try {
        const fileContent = await fs.readFile(geojsonFilePath, "utf8");
        geojsonData = JSON.parse(fileContent);
      } catch (error) {}

      // Добавление новой фичи в массив фич
      res.json(geojsonData);
    } catch (error) {
      console.error("Ошибка при добавлении в GeoJSON файл:", error);
    }
  }
  addDataToGeoJSONFile(req);
});

// Загрузка KML файла
app.post("/uploadKMZ", upload.single("kmlFile"), async (req, res) => {
  const zip = new JSZip();
  const zipContents = await zip.loadAsync(req.file.buffer);
  const kmlFile = zipContents.file(/\.kml$/i)[0];
  const kmlText = await kmlFile.async("string");

  // Создание DOM из KML текста
  const dom = new DOMParser().parseFromString(kmlText);
  const kml = dom.documentElement;

  // Преобразование KML в GeoJSON
  const geoJSON = toGeoJSON.kml(kml);
  const commonUUID = uuidv4();

  // Добавление уникального ID к каждому feature
  geoJSON.features.forEach((feature) => {
    feature.properties.id = uuidv4();
    feature.properties.title = "title";
    feature.properties.description = "description";
    feature.properties.link = "link";

    if (feature.geometry && feature.geometry.type === "LineString") {
      // Преобразование LineString в Polygon
      feature.geometry.type = "Polygon";
      // Оборачиваем координаты LineString в дополнительный массив для Polygon
      feature.geometry.coordinates = [feature.geometry.coordinates];
      feature.properties.id = commonUUID
    }
  });

  try {
    // Попытка чтения файла mark.geojson
    let existingData;
    try {
      const existingGeoJSON = await fs.readFile("marks.geojson", "utf8");
      existingData = JSON.parse(existingGeoJSON);
    } catch (error) {
      // Если файл не существует или пустой, создаем новый объект GeoJSON
      existingData = { type: "FeatureCollection", features: [] };
    }

    // Добавление новых меток, избегая дубликатов
    const newFeatures = geoJSON.features.filter(
      (newFeature) =>
        !existingData.features.some(
          (existingFeature) =>
            JSON.stringify(existingFeature.geometry.coordinates) ===
            JSON.stringify(newFeature.geometry.coordinates)
        )
    );

    existingData.features = existingData.features.concat(newFeatures);

    // Сохранение обновленного GeoJSON обратно в mark.geojson
    await fs.writeFile("marks.geojson", JSON.stringify(existingData, null, 2));

    res.send("Метки из KML файла успешно добавлены");
  } catch (error) {
    res.status(500).send("Ошибка при обработке файла: " + error.message);
  }
});

app.get("/landing/get-elements", async (req, res) => {
  try {
    const html = await fs.readFile("public/index.html", "utf8");
    const $ = cheerio.load(html);

    const serviceElements = $(".services__inner")
      .map((i, el) => {
        // Минификация HTML каждого элемента
        return minify($(el).html(), {
          collapseWhitespace: true,
          removeComments: true,
        });
      })
      .get();

    const publicationElements = $(".publications__list")
      .map((i, el) => {
        return minify($(el).html(), {
          collapseWhitespace: true,
          removeComments: true,
        });
      })
      .get();

    const membersElements = $(".our-team__members")
      .map((i, el) => {
        return minify($(el).html(), {
          collapseWhitespace: true,
          removeComments: true,
        });
      })
      .get();

    const elements = [
      ...serviceElements,
      ...publicationElements,
      ...membersElements,
    ];
    res.json(elements);
  } catch (error) {
    console.error(error);
    res.status(500).send("Ошибка при извлечении элементов.");
  }
});

app.post("/landing/delete", async (req, res) => {
  const { id } = req.body;

  try {
    // Читаем файл index.html
    const data = await fs.readFile("public/index.html", "utf8");

    const dom = new JSDOM(data);
    const document = dom.window.document;

    // Находим и удаляем элемент по id
    const element = document.getElementById(id);
    if (element) {
      element.remove();
    } else {
      return res.status(404).send(`Элемент с ID ${id} не найден`);
    }

    // Сохраняем обновлённый файл
    await fs.writeFile("public/index.html", dom.serialize());
    res.status(200).send(`Элемент с ID ${id} удалён`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Ошибка на сервере");
  }
});

app.post("/landing/edit", async (req, res) => {
  console.log(req.body);

  try {
    // Читаем файл index.html
    const data = await fs.readFile("public/index.html", "utf8");

    const dom = new JSDOM(data);
    const document = dom.window.document;
    if (req.body.type == "services") {
      // Находим и меняем элемент по id
      const element = document.getElementById(req.body.id);
      if (element) {
        element.querySelector("h3").innerHTML = req.body.newTitle;
        element.querySelector("p").innerHTML = req.body.newDescription;
      }
    } else if (req.body.type == "members") {
      const element = document.getElementById(req.body.id);
      if (element) {
        element.querySelector("h3").innerHTML = req.body.name;
        element.querySelector("span").innerHTML = req.body.position;
        if (req.body.photoLink){
          element.querySelector("img").src = req.body.photoLink
        }
      }
    }
    
    else {
      return res.status(404).send(`Элемент с ID ${req.body.id} не найден`);
    }

    // Сохраняем обновлённый файл
    await fs.writeFile("public/index.html", dom.serialize());
    res.status(200).send(`Элемент с ID ${req.body.id} удалён`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Ошибка на сервере");
  }
});

app.post("/landing/add", async (req, res) => {
  try {
    // Чтение и парсинг файла index.html
    const html = await fs.readFile("public/index.html", "utf8");
    const dom = new JSDOM(html);
    const document = dom.window.document;

    if (req.body.type == "services") {
      // Создание нового элемента article
      const article = document.createElement("article");
      article.className = "service changeable";
      article.id = uuidv4(); // Генерация уникального ID

      // Добавление изображения
      const img = document.createElement("img");
      img.src = req.body.imageUrl;
      img.alt = "";
      article.appendChild(img);

      // Добавление текста
      const textDiv = document.createElement("div");
      textDiv.className = "service__text";
      const h3 = document.createElement("h3");
      h3.textContent = req.body.title;
      const p = document.createElement("p");
      p.textContent = req.body.description;
      textDiv.appendChild(h3);
      textDiv.appendChild(p);

      article.appendChild(textDiv);

      // Добавление нового элемента в HTML

      const container = document.querySelector(".services__inner");
      if (container) {
        container.appendChild(article);
      }
    } else if (req.body.type == "publications") {
      const publication = document.createElement("li");
      publication.className = "publications__item";
      publication.id = uuidv4();
      publication.innerHTML = req.body.text;

      const container = document.querySelector(".publications__list");

      if (container) {
        container.appendChild(publication);
      }
    } else if (req.body.type == "members"){
      const article = document.createElement("article");
      article.className = "our-team__member";
      article.id = uuidv4();

      const img = document.createElement("img");
      img.src = req.body.photoLink;

      const name = document.createElement("h3")
      name.innerHTML = req.body.name ;

      const position = document.createElement("span")
      position.innerHTML = req.body.position ;

      article.append(img,name,position)

      const container = document.querySelector(".our-team__members");

      if (container) {
        container.appendChild(article);
      }
    }
    
    else {
      // Если контейнер не найден, отправить сообщение об ошибке
      return res.status(500).send("Контейнер для статей не найден.");
    }

    // Сохранение изменений в файле index.html
    await fs.writeFile("public/index.html", dom.serialize());
    res.status(200).send("Статья успешно добавлена");
  } catch (error) {
    console.error(error);
    res.status(500).send("Ошибка при добавлении статьи.");
  }
});

app.listen(port, () => {
  console.log(`Сервер запущен на порту ${port}`);
});