package main

import (
	"encoding/json"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"sync"
	"time"
)

// Модели данных
type Question struct {
	ID          string   `json:"id"`
	Text        string   `json:"text"`
	Type        string   `json:"type"` // text, number, select
	Options     []string `json:"options,omitempty"`
	Required    bool     `json:"required"`
	Placeholder string   `json:"placeholder,omitempty"`
}

type Answer struct {
	QuestionID string      `json:"questionId"`
	Value      interface{} `json:"value"`
}

type Submission struct {
	ID        string    `json:"id"`
	Answers   []Answer  `json:"answers"`
	Timestamp time.Time `json:"timestamp"`
}

// Хранилище в памяти
type Storage struct {
	submissions []Submission
	mu          sync.RWMutex
}

var (
	questions = []Question{
		{
			ID:          "name",
			Text:        "Как вас зовут?",
			Type:        "text",
			Required:    true,
			Placeholder: "Введите ваше имя",
		},
		{
			ID:          "email",
			Text:        "Ваш email",
			Type:        "text",
			Required:    true,
			Placeholder: "example@domain.com",
		},
		{
			ID:       "age",
			Text:     "Ваш возраст",
			Type:     "number",
			Required: false,
		},
		{
			ID:       "gender",
			Text:     "Ваш пол",
			Type:     "select",
			Required: true,
			Options:  []string{"Мужской", "Женский", "Не указывать"},
		},
		{
			ID:          "feedback",
			Text:        "Оставьте ваш отзыв",
			Type:        "text",
			Required:    false,
			Placeholder: "Напишите ваши пожелания...",
		},
	}

	storage = &Storage{}
)

// Обработчики API
func getQuestions(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	if err := json.NewEncoder(w).Encode(questions); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func postAnswers(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	var answers []Answer
	if err := json.NewDecoder(r.Body).Decode(&answers); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Валидация обязательных вопросов
	for _, q := range questions {
		if q.Required {
			found := false
			for _, a := range answers {
				if a.QuestionID == q.ID && a.Value != nil && a.Value != "" {
					found = true
					break
				}
			}
			if !found {
				http.Error(w, fmt.Sprintf("Обязательный вопрос не заполнен: %s", q.Text), http.StatusBadRequest)
				return
			}
		}
	}

	// Сохранение
	submission := Submission{
		ID:        fmt.Sprintf("%d", time.Now().UnixNano()),
		Answers:   answers,
		Timestamp: time.Now(),
	}

	storage.mu.Lock()
	storage.submissions = append(storage.submissions, submission)
	storage.mu.Unlock()

	// Ответ
	response := map[string]interface{}{
		"success":          true,
		"message":          "Ответы сохранены",
		"submissionId":     submission.ID,
		"totalSubmissions": len(storage.submissions),
	}

	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func getSubmissions(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	storage.mu.RLock()
	defer storage.mu.RUnlock()

	if err := json.NewEncoder(w).Encode(storage.submissions); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// Обработчик главной страницы
func homePage(w http.ResponseWriter, r *http.Request) {
	tmpl, err := template.ParseFiles("templates/index.html")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	data := struct {
		Title string
	}{
		Title: "Анкета",
	}

	if err := tmpl.Execute(w, data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func main() {
	// Настройка маршрутов
	http.HandleFunc("/", homePage)
	http.HandleFunc("/questions", getQuestions)
	http.HandleFunc("/answers", postAnswers)
	http.HandleFunc("/submissions", getSubmissions)

	// Статические файлы
	http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))

	// Запуск сервера
	port := ":8080"
	fmt.Printf("Сервер запущен на http://localhost%s\n", port)
	fmt.Println("Доступные эндпоинты:")
	fmt.Println("  GET  /              - Главная страница")
	fmt.Println("  GET  /questions     - Получить вопросы анкеты")
	fmt.Println("  POST /answers       - Отправить ответы")
	fmt.Println("  GET  /submissions   - Получить все ответы")

	if err := http.ListenAndServe(port, nil); err != nil {
		log.Fatal(err)
	}
}
