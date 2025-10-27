;; web-server.clj - Simple Clojure web server example
;; Demonstrates Ring and Compojure web framework usage

(ns web-server.core
  (:require [ring.adapter.jetty :refer [run-jetty]]
            [compojure.core :refer [defroutes GET POST]]
            [compojure.route :as route]
            [ring.middleware.json :refer [wrap-json-response wrap-json-body]]
            [ring.util.response :refer [response]]))

;; Simple in-memory database (atom)
(def todos (atom [{:id 1 :title "Learn Clojure" :completed false}
                  {:id 2 :title "Build a web app" :completed false}]))

;; Helper functions
(defn get-todos []
  @todos)

(defn add-todo [title]
  (let [new-id (inc (apply max (map :id @todos)))
        new-todo {:id new-id :title title :completed false}]
    (swap! todos conj new-todo)
    new-todo))

(defn toggle-todo [id]
  (swap! todos
         (fn [todos]
           (map #(if (= (:id %) id)
                   (update % :completed not)
                   %)
                todos))))

;; Route handlers
(defn home-handler [request]
  (response {:message "Welcome to the Todo API"
             :endpoints ["/todos" "/todos/:id/toggle"]}))

(defn todos-handler [request]
  (response {:todos (get-todos)}))

(defn add-todo-handler [request]
  (let [title (get-in request [:body :title])]
    (if title
      (response {:todo (add-todo title)})
      (response {:error "Title is required"}))))

(defn toggle-handler [request]
  (let [id (Integer/parseInt (get-in request [:params :id]))]
    (toggle-todo id)
    (response {:todos (get-todos)})))

;; Define routes
(defroutes app-routes
  (GET "/" [] home-handler)
  (GET "/todos" [] todos-handler)
  (POST "/todos" [] add-todo-handler)
  (POST "/todos/:id/toggle" [] toggle-handler)
  (route/not-found {:error "Not found"}))

;; Application with middleware
(def app
  (-> app-routes
      (wrap-json-body {:keywords? true})
      wrap-json-response))

;; Start server
(defn -main [& args]
  (let [port (Integer/parseInt (or (first args) "3000"))]
    (println (str "Starting server on port " port "..."))
    (run-jetty app {:port port :join? false})))

;; Development REPL usage:
;; (def server (-main "3000"))
;; (.stop server)
