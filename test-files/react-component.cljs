;; react-component.cljs - ClojureScript React component example
;; Using Reagent (ClojureScript React wrapper)

(ns react-component.core
  (:require [reagent.core :as r]
            [reagent.dom :as rdom]))

;; Application state
(defonce app-state
  (r/atom {:counter 0
           :todos []
           :input-value ""}))

;; Helper functions
(defn add-todo! []
  (let [value (:input-value @app-state)]
    (when-not (empty? value)
      (swap! app-state
             (fn [state]
               (-> state
                   (update :todos conj {:id (random-uuid)
                                       :text value
                                       :completed false})
                   (assoc :input-value "")))))))

(defn toggle-todo! [id]
  (swap! app-state
         update :todos
         (fn [todos]
           (mapv #(if (= (:id %) id)
                   (update % :completed not)
                   %)
                todos))))

(defn delete-todo! [id]
  (swap! app-state
         update :todos
         (fn [todos]
           (filterv #(not= (:id %) id) todos))))

;; Components
(defn counter-component []
  [:div.counter
   [:h2 "Counter Example"]
   [:p "Current count: " (:counter @app-state)]
   [:button {:on-click #(swap! app-state update :counter inc)}
    "Increment"]
   [:button {:on-click #(swap! app-state update :counter dec)}
    "Decrement"]
   [:button {:on-click #(swap! app-state assoc :counter 0)}
    "Reset"]])

(defn todo-item [todo]
  [:li {:key (:id todo)
        :class (when (:completed todo) "completed")}
   [:input {:type "checkbox"
            :checked (:completed todo)
            :on-change #(toggle-todo! (:id todo))}]
   [:span {:style {:text-decoration (when (:completed todo) "line-through")}}
    (:text todo)]
   [:button {:on-click #(delete-todo! (:id todo))}
    "Delete"]])

(defn todo-list-component []
  (let [todos (:todos @app-state)
        completed (count (filter :completed todos))
        total (count todos)]
    [:div.todo-list
     [:h2 "Todo List"]
     [:div.input-group
      [:input {:type "text"
               :value (:input-value @app-state)
               :placeholder "Enter a new todo..."
               :on-change #(swap! app-state assoc :input-value (-> % .-target .-value))
               :on-key-press #(when (= (.-key %) "Enter")
                               (add-todo!))}]
      [:button {:on-click add-todo!} "Add"]]
     [:p (str "Completed: " completed " / " total)]
     [:ul
      (for [todo todos]
        [todo-item todo])]]))

(defn app-component []
  [:div.app
   [:h1 "ClojureScript + Reagent Demo"]
   [counter-component]
   [:hr]
   [todo-list-component]])

;; Initialize app
(defn ^:export init []
  (rdom/render [app-component]
               (js/document.getElementById "app")))

;; Hot reload support
(defn ^:dev/after-load reload []
  (init))

;; Start the app
(init)
