Vue.component('columns', {
    template: `
            <div class="columns">
                <column title="New" :cards="newColumn" :locked="locked" @add-card="addCard('newColumn', $event)" @remove-card="removeCard('newColumn', $event)" @save-local-storage="saveToLocalStorage" @move-card-to-in-progress="moveCardToInProgress" @move-card-to-completed="moveCardToCompleted"></column>
                <column title="In process" :cards="inProgressColumn" @remove-card="removeCard('inProgressColumn', $event)" @save-local-storage="saveToLocalStorage" @move-card-to-in-progress="moveCardToInProgress" @move-card-to-completed="moveCardToCompleted" @lock-first-column="lockFirstColumn"></column>
                <column title="Done" :cards="completedColumn" @remove-card="removeCard('completedColumn', $event)" @save-local-storage="saveToLocalStorage"></column>
            </div>
        `,

    data() {
        return {
            newColumn: [],
            inProgressColumn: [],
            completedColumn: [],
            maxCards: {
                newColumn: 3,
                inProgressColumn: 5,
                completedColumn: Infinity
            },
            locked: false
        }
    },
    created() {
        this.loadFromLocalStorage();
        this.checkLock();
    },
    props: ['completionPercentage'],

    methods: {
        addCard(column, customTitle) {
            const totalCards = this.newColumn.length + this.inProgressColumn.length + this.completedColumn.length;
            if (this[column].length >= this.maxCards[column]) {
                alert(`Максимальное количество карточек в столбце "${this.getColumnTitle(column)}".`);
                return;
            }
            if (this.inProgressColumn.length >= this.maxCards.inProgressColumn) {
                alert('Столбец "In process" уже содержит максимальное количество карточек.');
                return;
            }
            const newCard = {
                title: customTitle || 'New note',
                items: [
                    {text: '', completed: false, editing: true},
                    {text: '', completed: false, editing: true},
                    {text: '', completed: false, editing: true}
                ],
                status: 'New'
            };
            this[column].push(newCard);
            this.saveToLocalStorage();
            this.checkLock()
        },
        removeCard(column, cardIndex) {
            this[column].splice(cardIndex, 1);
            this.saveToLocalStorage();
            this.checkLock();
        },
        saveToLocalStorage() {
            localStorage.setItem('todo-columns', JSON.stringify({
                newColumn: this.newColumn,
                inProgressColumn: this.inProgressColumn,
                completedColumn: this.completedColumn
            }));

        },
        loadFromLocalStorage() {
            const data = JSON.parse(localStorage.getItem('todo-columns'));
            if (data) {
                this.newColumn = data.newColumn || [];
                this.inProgressColumn = data.inProgressColumn || [];
                this.completedColumn = data.completedColumn || [];
                this.newColumn.forEach(card => card.items.forEach(item => item.completed = !!item.completed));
                this.inProgressColumn.forEach(card => card.items.forEach(item => item.completed = !!item.completed));
                this.completedColumn.forEach(card => card.items.forEach(item => item.completed = !!item.completed));
            }
        },
        getColumnTitle(column) {
            switch (column) {
                case 'newColumn':
                    return 'New';
                case 'inProgressColumn':
                    return 'In process';
                case 'completedColumn':
                    return 'Done';
                default:
                    return '';
            }
        },
        moveCardToInProgress(card) {
            if (!this.locked) {
                const index = this.newColumn.indexOf(card);
                if (index !== -1) {
                    if (this.inProgressColumn.length >= this.maxCards.inProgressColumn) {
                        return;
                    }
                    this.newColumn.splice(index, 1);
                    this.inProgressColumn.push(card);
                    this.saveToLocalStorage();
                    this.checkLock();
                }
            }
        },
        moveCardToCompleted(card) {
            const index = this.inProgressColumn.indexOf(card);
            if (index !== -1) {
                this.inProgressColumn.splice(index, 1);
                this.completedColumn.push(card);
                this.saveToLocalStorage();
            }
            this.checkLock();
        },
        checkLock() {
            const maxInProgressCardsReached = this.inProgressColumn.length >= this.maxCards.inProgressColumn;
            if (maxInProgressCardsReached) {
                this.newColumn.forEach(card => {
                    const completedItems = card.items.filter(item => item.completed).length;
                    const totalItems = card.items.length;
                    const completionPercentage = (completedItems / totalItems) * 100;
                    if (completionPercentage >= 50) {
                        card.locked = true;
                    } else {
                        card.locked = false;
                    }
                });
            } else {
                this.locked = false;
                this.newColumn.forEach(card => {
                    card.locked = false;
                });
            }
        }
    },
    watch: {
        newColumn: {
            handler() {
                this.checkLock();
            },
            deep: true
        },
        inProgressColumn: {
            handler() {
                this.checkLock();
            },
            deep: true
        },
        completedColumn: {
            handler() {
                this.checkLock();
            },
            deep: true
        }
    },
});

Vue.component('column', {
    props: ['title', 'cards', 'locked'],
    template: `
        <div class="column">
            <h2>{{ title }}</h2>
            <form action="" v-if="title === 'New'">
                <input class="vvod" type="text" v-model="customTitle">
                <button class="btn" v-if="title !== 'In process' && title !== 'In process'" @click="addCardWithCustomTitle" ref="new_card" v-bind:disabled="locked">Add note</button>
            </form>
            <card v-for="(card, index) in cards" :key="index" :card="card" @remove-card="removeCard(index)" @save-local-storage="saveToLocalStorage"  @move-card-to-in-progress="moveCardToInProgress" @move-card-to-completed="moveCardToCompleted"></card>
        </div>
        `,

    data() {
        return {
            customTitle: ''
        };
    },

    methods: {
        removeCard(cardIndex) {
            this.$emit('remove-card', cardIndex);
        },
        addCardWithCustomTitle() {
            if (this.customTitle) {
                this.$emit('add-card', this.customTitle);
            }
        },
        saveToLocalStorage() {
            this.$emit('save-local-storage');
        },
        moveCardToInProgress(card) {
            this.$emit('move-card-to-in-progress', card);
        },
        moveCardToCompleted(card) {
            this.$emit('move-card-to-completed', card);
        }
    }
});

Vue.component('card', {
    props: ['card'],
    template: `
      <div class="card">
      <h3>{{ card.title }}</h3>
      <ul>
        <li v-for="(item, index) in card.items" :key="index">
          <input class="light" type="checkbox" v-model="item.completed" @change="saveToLocalStorage" :disabled="card.locked || card.status === 'Done'">
          <input type="text" v-model="item.text" @input="saveToLocalStorage" :disabled="card.locked || !item.editing || card.status === 'Done'">
          <button class="btn" @click="editItem(index)" v-else-if="!item.editing && card.status !== 'Done' && !card.locked">Refactor</button>
        </li>
      </ul> 
      <button class="btn" v-if="card.status !== 'Done' && !card.locked" @click="removeCard">Delete note</button>
      <p class="lockedP" v-if="card.locked">Card is locked due to maximum cards in the second column.</p>
      <p v-if="card.status === 'Done'">Date of the end: {{ card.completionDate }}</p>
  </div>
    `,
    methods: {
        removeCard() {
            if (this.card.locked) {
                alert("You can't delete a locked card.");
                return;
            }
            this.$emit('remove-card');
        },
        saveToLocalStorage() {
            this.checkCardStatus();
            this.$emit('save-local-storage');
        },
        checkCardStatus() {
            const completedItems = this.card.items.filter(item => item.completed).length;
            const totalItems = this.card.items.length;
            const completionPercentage = (completedItems / totalItems) * 100;

            if (completionPercentage >= 100) {
                this.card.status = 'Done';
                this.card.completionDate = new Date().toLocaleString();
                this.$emit('move-card-to-completed', this.card);
            } else if (completionPercentage > 50 && this.card.status === 'New' && this.locked) {
                this.$emit('lock-first-column');
            } else if (completionPercentage > 50 && this.card.status === 'New') {
                this.$emit('move-card-to-in-progress', this.card);
            } else if (completionPercentage === 100 && this.card.status === 'In process') {
            } else {
                this.card.status = 'New';
            }
        }
    },
});

new Vue({
    el: '#app',
    data() {
        return {
            newColumn: [],
            inProgressColumn: [],
            completedColumn: [],
            locked: false
        }
    },
    created() {
        this.loadFromLocalStorage();
    },
    methods: {
        removeCard(column, cardIndex) {
            this[column].splice(cardIndex, 1);
            this.saveToLocalStorage();
        },
        saveToLocalStorage() {
            localStorage.setItem('todo-columns', JSON.stringify({
                newColumn: this.newColumn,
                inProgressColumn: this.inProgressColumn,
                completedColumn: this.completedColumn
            }));
        },
        loadFromLocalStorage() {
            const data = JSON.parse(localStorage.getItem('todo-columns'));
            if (data) {
                this.newColumn = data.newColumn || [];
                this.inProgressColumn = data.inProgressColumn || [];
                this.completedColumn = data.completedColumn || [];
                this.newColumn.forEach(card => card.items.forEach(item => item.completed = !!item.completed));
                this.inProgressColumn.forEach(card => card.items.forEach(item => item.completed = !!item.completed));
                this.completedColumn.forEach(card => card.items.forEach(item => item.completed = !!item.completed));
            }
        },
    }
});
