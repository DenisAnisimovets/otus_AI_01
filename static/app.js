document.addEventListener('DOMContentLoaded', function() {
    const questionsContainer = document.getElementById('questions-container');
    const submitBtn = document.getElementById('submit-btn');
    const messageDiv = document.getElementById('message');
    const totalSubmissionsEl = document.getElementById('total-submissions');
    
    let questions = [];
    
    // Загрузка вопросов с сервера
    async function loadQuestions() {
        showLoading(true);
        try {
            const response = await fetch('/questions');
            if (!response.ok) throw new Error('Ошибка загрузки вопросов');
            
            questions = await response.json();
            renderQuestions(questions);
            submitBtn.disabled = false;
            showMessage('', '');
        } catch (error) {
            showMessage(`Ошибка: ${error.message}`, 'error');
            // Fallback на статические вопросы, если сервер недоступен
            loadFallbackQuestions();
        } finally {
            showLoading(false);
        }
    }
    
    // Fallback вопросы (если API недоступно)
    function loadFallbackQuestions() {
        questions = [
            {
                id: 'name',
                text: 'Как вас зовут?',
                type: 'text',
                required: true,
                placeholder: 'Введите ваше имя'
            },
            {
                id: 'email',
                text: 'Ваш email',
                type: 'text',
                required: true,
                placeholder: 'example@domain.com'
            },
            {
                id: 'age',
                text: 'Ваш возраст',
                type: 'number',
                required: false
            },
            {
                id: 'gender',
                text: 'Ваш пол',
                type: 'select',
                required: true,
                options: ['Мужской', 'Женский', 'Не указывать']
            },
            {
                id: 'feedback',
                text: 'Оставьте ваш отзыв',
                type: 'text',
                required: false,
                placeholder: 'Напишите ваши пожелания...'
            }
        ];
        renderQuestions(questions);
        submitBtn.disabled = false;
    }
    
    // Отображение вопросов
    function renderQuestions(questions) {
        questionsContainer.innerHTML = '';
        
        questions.forEach(question => {
            const questionEl = document.createElement('div');
            questionEl.className = 'question';
            
            const label = document.createElement('label');
            label.className = `question-label ${question.required ? 'required' : ''}`;
            label.textContent = question.text;
            label.htmlFor = question.id;
            
            questionEl.appendChild(label);
            
            let input;
            if (question.type === 'select') {
                input = document.createElement('select');
                input.id = question.id;
                
                // Добавляем пустую опцию
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = '-- Выберите вариант --';
                defaultOption.disabled = true;
                defaultOption.selected = true;
                input.appendChild(defaultOption);
                
                // Добавляем варианты ответа
                question.options.forEach(option => {
                    const optionEl = document.createElement('option');
                    optionEl.value = option;
                    optionEl.textContent = option;
                    input.appendChild(optionEl);
                });
            } else if (question.type === 'textarea') {
                input = document.createElement('textarea');
                input.id = question.id;
                input.placeholder = question.placeholder || '';
            } else {
                input = document.createElement('input');
                input.id = question.id;
                input.type = question.type;
                input.placeholder = question.placeholder || '';
            }
            
            if (question.required) {
                input.required = true;
            }
            
            questionEl.appendChild(input);
            questionsContainer.appendChild(questionEl);
        });
    }
    
    // Показать/скрыть индикатор загрузки
    function showLoading(show) {
        let loadingEl = document.getElementById('loading-questions');
        if (!loadingEl && show) {
            loadingEl = document.createElement('div');
            loadingEl.id = 'loading-questions';
            loadingEl.className = 'loading';
            loadingEl.textContent = 'Загрузка вопросов...';
            questionsContainer.appendChild(loadingEl);
        }
        
        if (loadingEl) {
            loadingEl.style.display = show ? 'block' : 'none';
        }
    }
    
    // Показать сообщение
    function showMessage(text, type) {
        if (!text) {
            messageDiv.style.display = 'none';
            messageDiv.className = 'message';
            return;
        }
        
        messageDiv.textContent = text;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';
        
        // Автоматически скрыть сообщение об успехе через 5 секунд
        if (type === 'success') {
            setTimeout(() => {
                showMessage('', '');
            }, 5000);
        }
    }
    
    // Отправка ответов
    async function submitAnswers() {
        const answers = [];
        let isValid = true;
        
        // Сбор ответов
        questions.forEach(question => {
            const element = document.getElementById(question.id);
            let value;
            
            if (element.type === 'checkbox') {
                value = element.checked;
            } else if (element.type === 'select-one') {
                value = element.value;
            } else {
                value = element.value.trim();
            }
            
            // Валидация обязательных полей
            if (question.required && (!value || value === '')) {
                isValid = false;
                element.style.borderColor = '#e74c3c';
                element.addEventListener('input', function() {
                    if (this.value.trim()) {
                        this.style.borderColor = '#ddd';
                    }
                });
            }
            
            answers.push({
                questionId: question.id,
                value: value || null
            });
        });
        
        if (!isValid) {
            showMessage('Пожалуйста, заполните все обязательные поля', 'error');
            return;
        }
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Отправка...';
        
        try {
            const response = await fetch('/answers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(answers)
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'Ошибка отправки');
            }
            
            showMessage(`✅ ${result.message} (ID: ${result.submissionId})`, 'success');
            
            // Обновить статистику
            if (result.totalSubmissions) {
                totalSubmissionsEl.textContent = result.totalSubmissions;
            }
            
            // Очистить форму
            document.querySelectorAll('input, select, textarea').forEach(element => {
                if (element.type !== 'submit' && element.type !== 'button') {
                    element.value = '';
                    
                    if (element.type === 'select-one') {
                        element.selectedIndex = 0;
                    }
                }
            });
            
        } catch (error) {
            showMessage(`Ошибка: ${error.message}`, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Отправить ответы';
        }
    }
    
    // Загрузить статистику
    async function loadStats() {
        try {
            const response = await fetch('/submissions');
            if (response.ok) {
                const submissions = await response.json();
                totalSubmissionsEl.textContent = submissions.length;
            }
        } catch (error) {
            console.log('Не удалось загрузить статистику:', error);
        }
    }
    
    // Инициализация
    submitBtn.addEventListener('click', submitAnswers);
    
    // Запуск
    loadQuestions();
    loadStats();
    
    // Автоматическое обновление статистики каждые 30 секунд
    setInterval(loadStats, 30000);
});